# Notes
- Main watch dog and spawner of initial tasks with a Mav Link Connection
- Will monitor for initial coniditons such as GPS lock, etc.
- Once conditions are met, will spawn the initial tasks
- Will continously monitor MavLink data and update various health topics on change
- Initial version can represent a linear chain of stages, with a group of tasks associated with each stage
- Default Tasks below can be made via constructors, with the option to override the default tasks
- Additional user defined tasks can be to the config, most importantly which tasks to run once
- HealthyGuided is reached (aka the actual autonomy tasks).
- Auto stage almost runs "under this". Almost like a mini exec. However the parent one can still kill it / spawns it. 



## Initial Stage Notes
- Default Tasks:
  - MavLinkTask
- Stages:
  - AwaitConnection
    - ConnectionWatchdog
  - AwaitingData
    - RequestStream
    - HeartbeatTask
  - AwaitingHealthy
    - HealthChecks
  - AwaitingLock
    - LockChecks
  - HealthyUnarmed
    - ArmChecks
  - HealthyArmed
    - ArmedIdle
  - HealthyGuided
    - ControlArmed
  - Unhealthy
    - ErrorTask
  - Fatal
    - PossomTask