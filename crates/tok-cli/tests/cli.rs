use std::process::Command;

#[test]
fn small_benchmark_does_not_panic() {
    let output = Command::new(env!("CARGO_BIN_EXE_tok-cli"))
        .args(["benchmark-typeset", "--pages", "1"])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn invalid_benchmarks_fail_cleanly() {
    for args in [
        vec!["--pages", "0"],
        vec!["--pages", "10001"],
        vec!["--pages", "invalid"],
        vec!["--pages"],
        vec!["--unknown"],
    ] {
        let output = Command::new(env!("CARGO_BIN_EXE_tok-cli"))
            .arg("benchmark-typeset")
            .args(args)
            .output()
            .unwrap();
        assert!(!output.status.success());
        assert!(!String::from_utf8_lossy(&output.stderr).contains("panicked"));
    }
}
