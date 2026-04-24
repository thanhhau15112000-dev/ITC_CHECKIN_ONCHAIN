# ITC Check-in Onchain

Sui Move smart contract for an onchain attendance system built around classes and sessions.

This package supports two attendance flows:

- Teacher-managed attendance for a specific student in a class
- Student self check-in using `session_code + student_code + full_name`

## What This Contract Does

The contract stores and manages:

- teacher permissions
- classes
- student lists for each class
- attendance sessions
- attendance records
- a lookup from `session_code` to `session_id`

The intended workflow is:

1. Admin authorizes a teacher
2. Teacher creates a class
3. Teacher adds students to the class
4. Teacher opens a session and shares the session code
5. Students self check in, or the teacher checks them in manually
6. Teacher closes the session

## Main Objects

### `AdminCap`

Capability object for privileged admin actions.

### `Registry`

Shared onchain registry that contains the full attendance state:

- admin address
- class counter
- session counter
- classes
- sessions
- attendance records
- session code index
- teacher list

### `StudentProfile`

Student information stored inside a class:

- `student_code`
- `full_name`
- optional wallet address

### `Classroom`

Represents a class:

- `class_id`
- `class_name`
- teacher address
- list of students

### `Session`

Represents one attendance session:

- `session_id`
- `class_id`
- `session_label`
- `session_code`
- `start_ts`
- `end_ts`
- `is_open`

### `AttendanceRecord`

Stores:

- attendance status
- check-in timestamp

## Attendance Status

- `0` = `Absent`
- `1` = `OnTime`
- `2` = `Late`

Student self check-in currently records status `OnTime` by default.

## Entry Functions

### Initialization and permissions

- `init_admin(ctx)`
- `register_teacher(admin_cap, registry, teacher, ctx)`

### Class management

- `create_class(registry, class_name, ctx)`
- `add_students(registry, class_id, student_codes, full_names, ctx)`

### Session management

- `open_session(registry, class_id, session_label, session_code, start_ts, end_ts, ctx)`
- `close_session(registry, class_id, session_id, ctx)`

### Attendance actions

- `teacher_check_in(registry, class_id, session_id, student_code, status, checked_in_at, ctx)`
- `student_check_in_by_code(registry, session_code, student_code, full_name, checked_in_at, ctx)`

## Helper Functions

- `has_attendance(...)`
- `has_attendance_by_code(...)`
- `get_attendance_status(...)`
- `get_attendance_status_by_code(...)`
- `get_session_state(...)`
- `get_session_id_by_code(...)`
- `is_valid_status(...)`

Use the source file for exact signatures.

## Access Rules

- Only the admin can register teachers
- Only a registered teacher or the admin can create a class
- Only the class owner or the admin can open or close sessions
- Only the class owner or the admin can perform teacher check-in
- Student self check-in only works when:
  - the session code exists
  - the session is still open
  - `student_code + full_name` matches a student already added to the class

## Project Structure

```text
contract/
├─ sources/
│  └─ contract.move
├─ tests/
│  └─ contract_tests.move
├─ Move.toml
├─ Move.lock
├─ Published.toml
└─ README.md
```

## Local Development

Run tests:

```bash
sui move test
```

Build the package:

```bash
sui move build
```

## Published Package

The current published testnet package is tracked in `Published.toml`.

Current value:

- network: `testnet`
- published package: `0xdd89da229ae6906fd513cc212c0fda266c8736298a6c5fb2251836257ed43191`

## Frontend Integration Notes

The frontend uses friendlier labels for technical blockchain fields:

- `Package ID` -> deployed package address
- `Registry ID` -> shared attendance registry object
- `AdminCap ID` -> admin capability object

If you publish a new contract version, update the frontend configuration with the new values.
