f# Notes
# Notes
- Like the exec, this is a chain of stages.
- Each stage has a set of tasks associated with it.
- Stage at: auto/stage.rs

## Initial Stage Notes
- AutoShadow
  - Disabled and waiting for an external command to start
- AutoStart
  - Takeoff (promotes to AutoHover)
    - Sends take off command to Ardupilot
    - Parameter on construction
    - Once near take off altitude, promotes AutoStage to AutoHover
- AutoHover
  - GuidedInit (Sets Mode to GUIDED, initial pose, and promotes to AutoGuided)
    - Sets ardupilot to guided mode
    - Sets initial position to {param.initial_position} from config to auto/guided_position
    - Promotes to AutoGuided
      - Sets the AutoStage to AutoGuided
  - SendGuidance
    - Sends guidance command to Ardupilot
    - Parameter on construction
- AutoGuided 
  - SendGuidance
    - Continuously sends position guidance commands to Ardupilot
  - ListenForShow
    - [TODO]
  - ListenForLand
    -  Listen for auto/land command
    -  Promotes to AutoLand
- AutoLand
  - Land
    - Sends landing command to Ardupilot
    - Monitors descent rate and altitude
    - Confirms successful landing