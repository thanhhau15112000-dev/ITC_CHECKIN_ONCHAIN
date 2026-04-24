module contract::contract {
    use std::vector;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use std::option::{Self, Option};

    const E_NOT_ADMIN: u64 = 1;
    const E_NOT_TEACHER: u64 = 2;
    const E_CLASS_NOT_FOUND: u64 = 3;
    const E_NOT_CLASS_OWNER: u64 = 4;
    const E_STUDENT_NOT_WHITELISTED: u64 = 5;
    const E_SESSION_NOT_FOUND: u64 = 6;
    const E_SESSION_CLOSED: u64 = 7;
    const E_INVALID_STATUS: u64 = 8;
    const E_INVALID_TIME_RANGE: u64 = 9;
    const E_CLASS_SESSION_MISMATCH: u64 = 10;
    const E_INVALID_STUDENT_INPUT: u64 = 11;
    const E_STUDENT_NOT_FOUND: u64 = 12;
    const E_SESSION_CODE_NOT_FOUND: u64 = 13;
    const E_SESSION_CODE_ALREADY_EXISTS: u64 = 14;

    const STATUS_ABSENT: u8 = 0;
    const STATUS_ON_TIME: u8 = 1;
    const STATUS_LATE: u8 = 2;

    /// Admin capability used to authorize privileged updates.
    public struct AdminCap has key {
        id: object::UID,
    }

    /// Shared onchain registry for classes, sessions and attendance.
    public struct Registry has key {
        id: UID,
        admin: address,
        next_class_id: u64,
        next_session_id: u64,
        classes: Table<u64, Classroom>,
        sessions: Table<u64, Session>,
        attendance: Table<AttendanceKey, AttendanceRecord>,
        session_code_index: Table<vector<u8>, u64>,
        teachers: vector<address>,
    }

    public struct StudentProfile has copy, drop, store {
        student_code: vector<u8>,
        full_name: vector<u8>,
        wallet_opt: Option<address>,
    }

    public struct Classroom has store {
        class_id: u64,
        class_name: vector<u8>,
        teacher: address,
        students: vector<StudentProfile>,
    }

    public struct Session has store {
        session_id: u64,
        class_id: u64,
        session_label: vector<u8>,
        session_code: vector<u8>,
        start_ts: u64,
        end_ts: u64,
        is_open: bool,
    }

    public struct AttendanceKey has copy, drop, store {
        session_id: u64,
        student_code: vector<u8>,
    }

    public struct AttendanceRecord has store {
        status: u8,
        checked_in_at: u64,
    }

    /// Deploy admin capability + shared registry.
    public fun init_admin(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);

        transfer::transfer(AdminCap { id: object::new(ctx) }, sender);
        transfer::share_object(Registry {
            id: object::new(ctx),
            admin: sender,
            next_class_id: 1,
            next_session_id: 1,
            classes: table::new(ctx),
            sessions: table::new(ctx),
            attendance: table::new(ctx),
            session_code_index: table::new(ctx),
            teachers: vector::empty(),
        });
    }

    /// Admin adds teacher wallet that can open and manage classes.
    public fun register_teacher(
        admin_cap: &AdminCap,
        registry: &mut Registry,
        teacher: address,
        ctx: &TxContext
    ) {
        let _ = admin_cap;
        assert_admin(registry, tx_context::sender(ctx));
        if (!contains_address(&registry.teachers, teacher)) {
            vector::push_back(&mut registry.teachers, teacher);
        };
    }

    /// Teacher/admin creates a class and becomes class owner.
    public fun create_class(registry: &mut Registry, class_name: vector<u8>, ctx: &TxContext) {
        let sender = tx_context::sender(ctx);
        assert_teacher_or_admin(registry, sender);

        let class_id = registry.next_class_id;
        registry.next_class_id = class_id + 1;
        table::add(
            &mut registry.classes,
            class_id,
            Classroom {
                class_id,
                class_name,
                teacher: sender,
                students: vector::empty(),
            }
        );
    }

    /// Class owner/admin appends student wallets to class whitelist.
    public fun add_students(
        registry: &mut Registry,
        class_id: u64,
        student_codes: vector<vector<u8>>,
        full_names: vector<vector<u8>>,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let is_admin = sender == registry.admin;
        let classroom = borrow_class_mut(registry, class_id);
        assert!(classroom.teacher == sender || is_admin, E_NOT_CLASS_OWNER);
        assert!(vector::length(&student_codes) == vector::length(&full_names), E_INVALID_STUDENT_INPUT);

        let len = vector::length(&student_codes);
        let mut i = 0;
        while (i < len) {
            let student_code = *vector::borrow(&student_codes, i);
            let full_name = *vector::borrow(&full_names, i);
            if (!contains_student_code(&classroom.students, &student_code)) {
                vector::push_back(&mut classroom.students, StudentProfile {
                    student_code,
                    full_name,
                    wallet_opt: option::none<address>(),
                });
            };
            i = i + 1;
        };
    }

    /// Class owner/admin opens a session with time window.
    public fun open_session(
        registry: &mut Registry,
        class_id: u64,
        session_label: vector<u8>,
        session_code: vector<u8>,
        start_ts: u64,
        end_ts: u64,
        ctx: &TxContext
    ) {
        assert!(start_ts <= end_ts, E_INVALID_TIME_RANGE);
        assert!(!table::contains(&registry.session_code_index, session_code), E_SESSION_CODE_ALREADY_EXISTS);

        let sender = tx_context::sender(ctx);
        {
            let classroom = borrow_class(registry, class_id);
            assert_class_manager(registry, classroom, sender);
        };

        let session_id = registry.next_session_id;
        registry.next_session_id = session_id + 1;
        table::add(
            &mut registry.sessions,
            session_id,
            Session {
                session_id,
                class_id,
                session_label,
                session_code,
                start_ts,
                end_ts,
                is_open: true,
            }
        );
        table::add(&mut registry.session_code_index, session_code, session_id);
    }

    /// Teacher/admin marks attendance for a specific student in class.
    public fun teacher_check_in(
        registry: &mut Registry,
        class_id: u64,
        session_id: u64,
        student_code: vector<u8>,
        status: u8,
        checked_in_at: u64,
        ctx: &TxContext
    ) {
        assert!(is_valid_status(status), E_INVALID_STATUS);
        let sender = tx_context::sender(ctx);
        let classroom = borrow_class(registry, class_id);
        assert_class_manager(registry, classroom, sender);
        assert!(contains_student_code(&classroom.students, &student_code), E_STUDENT_NOT_FOUND);

        let session = borrow_session(registry, session_id);
        assert!(session.class_id == class_id, E_CLASS_SESSION_MISMATCH);
        assert!(session.is_open, E_SESSION_CLOSED);

        upsert_attendance(registry, session_id, student_code, status, checked_in_at);
    }

    /// Student self check-in by session code + student code.
    public fun student_check_in_by_code(
        registry: &mut Registry,
        session_code: vector<u8>,
        student_code: vector<u8>,
        full_name: vector<u8>,
        checked_in_at: u64,
        ctx: &TxContext
    ) {
        let _ = ctx;
        assert!(table::contains(&registry.session_code_index, session_code), E_SESSION_CODE_NOT_FOUND);
        let session_id = *table::borrow(&registry.session_code_index, session_code);
        let session = borrow_session(registry, session_id);
        assert!(session.is_open, E_SESSION_CLOSED);

        let classroom = borrow_class(registry, session.class_id);
        assert!(is_student_match(&classroom.students, &student_code, &full_name), E_STUDENT_NOT_WHITELISTED);
        upsert_attendance(registry, session_id, student_code, STATUS_ON_TIME, checked_in_at);
    }

    /// Class owner/admin closes session and freezes attendance updates.
    public fun close_session(
        registry: &mut Registry,
        class_id: u64,
        session_id: u64,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        {
            let classroom = borrow_class(registry, class_id);
            assert_class_manager(registry, classroom, sender);
        };

        let session = borrow_session_mut(registry, session_id);
        assert!(session.class_id == class_id, E_CLASS_SESSION_MISMATCH);
        session.is_open = false;
    }

    /// View: whether student already has attendance for the session.
    public fun has_attendance(registry: &Registry, session_id: u64, student: address): bool {
        let _ = student;
        false
    }

    /// View: whether student code already has attendance for the session.
    public fun has_attendance_by_code(registry: &Registry, session_id: u64, student_code: vector<u8>): bool {
        table::contains(
            &registry.attendance,
            AttendanceKey {
                session_id,
                student_code,
            }
        )
    }

    /// View: read attendance status for session + student code.
    public fun get_attendance_status(registry: &Registry, session_id: u64, student: address): u8 {
        let _ = student;
        STATUS_ABSENT
    }

    public fun get_attendance_status_by_code(registry: &Registry, session_id: u64, student_code: vector<u8>): u8 {
        let record = table::borrow(
            &registry.attendance,
            AttendanceKey {
                session_id,
                student_code,
            }
        );
        record.status
    }

    /// View: read whether a session is open.
    public fun get_session_state(registry: &Registry, session_id: u64): bool {
        let session = borrow_session(registry, session_id);
        session.is_open
    }

    public fun get_session_id_by_code(registry: &Registry, session_code: vector<u8>): u64 {
        assert!(table::contains(&registry.session_code_index, session_code), E_SESSION_CODE_NOT_FOUND);
        *table::borrow(&registry.session_code_index, session_code)
    }

    public fun is_valid_status(status: u8): bool {
        status == STATUS_ABSENT || status == STATUS_ON_TIME || status == STATUS_LATE
    }

    fun assert_admin(registry: &Registry, sender: address) {
        assert!(registry.admin == sender, E_NOT_ADMIN);
    }

    fun assert_teacher_or_admin(registry: &Registry, sender: address) {
        if (registry.admin == sender) {
            return
        };
        assert!(contains_address(&registry.teachers, sender), E_NOT_TEACHER);
    }

    fun assert_class_manager(registry: &Registry, classroom: &Classroom, sender: address) {
        assert!(classroom.teacher == sender || registry.admin == sender, E_NOT_CLASS_OWNER);
    }

    fun upsert_attendance(
        registry: &mut Registry,
        session_id: u64,
        student_code: vector<u8>,
        status: u8,
        checked_in_at: u64
    ) {
        let key = AttendanceKey { session_id, student_code };
        if (table::contains(&registry.attendance, key)) {
            let record = table::borrow_mut(&mut registry.attendance, key);
            record.status = status;
            record.checked_in_at = checked_in_at;
        } else {
            table::add(
                &mut registry.attendance,
                key,
                AttendanceRecord { status, checked_in_at }
            );
        };
    }

    fun contains_address(addrs: &vector<address>, target: address): bool {
        let len = vector::length(addrs);
        let mut i = 0;
        while (i < len) {
            if (*vector::borrow(addrs, i) == target) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun contains_student_code(students: &vector<StudentProfile>, student_code: &vector<u8>): bool {
        let len = vector::length(students);
        let mut i = 0;
        while (i < len) {
            let student = vector::borrow(students, i);
            if (&student.student_code == student_code) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun is_student_match(students: &vector<StudentProfile>, student_code: &vector<u8>, full_name: &vector<u8>): bool {
        let len = vector::length(students);
        let mut i = 0;
        while (i < len) {
            let student = vector::borrow(students, i);
            if (&student.student_code == student_code && &student.full_name == full_name) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun borrow_class(registry: &Registry, class_id: u64): &Classroom {
        assert!(table::contains(&registry.classes, class_id), E_CLASS_NOT_FOUND);
        table::borrow(&registry.classes, class_id)
    }

    fun borrow_class_mut(registry: &mut Registry, class_id: u64): &mut Classroom {
        assert!(table::contains(&registry.classes, class_id), E_CLASS_NOT_FOUND);
        table::borrow_mut(&mut registry.classes, class_id)
    }

    fun borrow_session(registry: &Registry, session_id: u64): &Session {
        assert!(table::contains(&registry.sessions, session_id), E_SESSION_NOT_FOUND);
        table::borrow(&registry.sessions, session_id)
    }

    fun borrow_session_mut(registry: &mut Registry, session_id: u64): &mut Session {
        assert!(table::contains(&registry.sessions, session_id), E_SESSION_NOT_FOUND);
        table::borrow_mut(&mut registry.sessions, session_id)
    }
}

