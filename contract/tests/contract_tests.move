#[test_only]
module contract::contract_tests {
    use contract::contract;

    #[test]
    fun valid_status_values_are_accepted() {
        assert!(contract::is_valid_status(0), 1);
        assert!(contract::is_valid_status(1), 2);
        assert!(contract::is_valid_status(2), 3);
    }

    #[test]
    fun invalid_status_values_are_rejected() {
        assert!(!contract::is_valid_status(3), 4);
        assert!(!contract::is_valid_status(255), 5);
    }

    #[test]
    fun status_range_keeps_teacher_and_student_flow_consistent() {
        // Teacher marks can use 0/1/2 and student self check-in defaults to 1 (OnTime).
        assert!(contract::is_valid_status(0), 6);
        assert!(contract::is_valid_status(1), 7);
        assert!(contract::is_valid_status(2), 8);
    }
}
