use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use std::time::Duration;
use anyhow::Result;
use clap::Parser;
use log::{info, error};
use quad::exec::exec_config::ExecConfig;
use quad::exec::exec_runner::ExecRunner;
use quad::exec::stage::ExecStage;
use quad::exec::tasks::exec_task_watchdog::ExecTaskWatchdog;
use quad::exec::tasks::exec_task_heartbeat::ExecTaskHeartbeat;
use quad::exec::tasks::exec_task_requeststream::ExecTaskRequestStream;
use rusty_docker_compose::DockerComposeCmd;

use pubsub::tasks::runner::Runner;
use quad::ardulink::config::ArdulinkConnectionType;
use quad::ardulink::task::MavlinkTask;

/// Simulation environment for ArduPilot integration
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Connection type: udp, tcp, serial
    #[arg(short, long, default_value = "tcp")]
    connection: String,

    /// Host address (for UDP/TCP)
    #[arg(short, long, default_value = "127.0.0.1")]
    address: String,

    /// Port number (for UDP/TCP) or baud rate (for serial)
    #[arg(short, long, default_value = "15760")]
    port: u32,

    /// Serial device path (for serial connections)
    #[arg(short, long)]
    device: Option<String>,

    /// Docker compose file for simulation
    #[arg( long, default_value = "./docker/compose-sil.yaml")]
    service_file: PathBuf,

    /// Number of simulated copters
    #[arg(short, long, default_value = "1")]
    num_copters: u32,

    /// Duration to run the simulation (in seconds)
    #[arg(short, long, default_value = "20")]
    timeout: u64,
    
    /// Directory for docker compose logs
    #[arg(long, default_value = "logs/docker")]
    log_dir: PathBuf,
}

fn main() -> Result<()> {
    pretty_env_logger::init();
    let args = Args::parse();

    // Start docker compose for simulation
    info!("Starting ArduPilot simulator with {} copters", args.num_copters);
    
    // Set environment variables for docker compose
    std::env::set_var("NUMCOPTERS", args.num_copters.to_string());
    
    // Create and start docker compose
    let docker_compose = DockerComposeCmd::new(
        args.service_file.to_str().unwrap(),
        args.log_dir.to_str().unwrap(),
    );
    
    docker_compose.up();
    info!("Docker Compose started");

    // Wait a bit for the simulator to start up
    std::thread::sleep(Duration::from_secs(3));
    info!("Simulator started, connecting to MAVLink");

    // Create connection configuration
    let connection_type = match args.connection.as_str() {
        "udp" => ArdulinkConnectionType::Udp(args.address.clone(), args.port),
        "tcp" => ArdulinkConnectionType::Tcp(args.address.clone(), args.port),
        "serial" => {
            let device = args.device.ok_or_else(|| {
                anyhow::anyhow!("Serial device path required for serial connections")
            })?;
            ArdulinkConnectionType::Serial(device, args.port)
        }
        _ => return Err(anyhow::anyhow!("Unsupported connection type")),
    };

    // Create MAVLink task
    info!("Creating MAVLink task with connection: {:?}", connection_type);
    let mavlink_task = Arc::new(Mutex::new(MavlinkTask::new(connection_type)));


    // Create and set up runner
    let mut runner = Runner::new();
    runner.add_task(mavlink_task);

    let exec_config = ExecConfig::new()
    .with_default_task("MavlinkTask".to_string())
    .with_stage_task(ExecStage::AwaitConnection, "ExecTaskWatchdog".to_string())
    .with_stage_task(ExecStage::AwaitingData, "ExecHeartbeatTask".to_string())
    .with_stage_task(ExecStage::AwaitingData, "ExecRequestStreamTask".to_string());

    let exec_runner = ExecRunner::new(exec_config);
    let exec_task_watchdog = ExecTaskWatchdog::new();
    let exec_task_heartbeat = ExecTaskHeartbeat::new();
    let exec_task_requeststream = ExecTaskRequestStream::new();

    runner.add_task(Arc::new(Mutex::new(exec_runner)));
    runner.add_task(Arc::new(Mutex::new(exec_task_watchdog)));
    runner.add_task(Arc::new(Mutex::new(exec_task_heartbeat)));
    runner.add_task(Arc::new(Mutex::new(exec_task_requeststream)));
    
    // Initialize tasks
    info!("Initializing tasks");
    runner.init()?;

    // Run for specified duration
    let start_time = std::time::Instant::now();
    let max_duration = Duration::from_secs(args.timeout);
    
    info!("Running MAVLink integration for {} seconds", args.timeout);
    while let result = runner.run() {
        match result {
            Ok(_) => {
                if start_time.elapsed() >= max_duration {
                    break;
                }
                std::thread::sleep(Duration::from_millis(100));
            },
            Err(err) => {
                error!("Runner error: {}", err);
                break;
            }
        }
    }

    // Clean up
    info!("Shutting down");
    runner.cleanup()?;
    // Stop containers
    docker_compose.down();
    info!("Docker Compose stopped");

    Ok(())
}
