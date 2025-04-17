#[cfg(feature = "tui")]
mod app;

#[cfg(feature = "tui")]
pub use app::run_tui_app;
