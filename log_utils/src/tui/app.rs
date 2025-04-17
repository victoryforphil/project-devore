#[cfg(feature = "tui")]
use std::io;
use std::path::PathBuf;
use std::time::Duration;

use anyhow::Result;
use arrow::array::RecordBatch;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::{Backend, CrosstermBackend},
    layout::{Margin, Rect},
    prelude::*,
    style::{Color, Modifier, Style, Stylize},
    text::{Line, Span},
    widgets::{
        Block, Borders, Cell, List, ListItem, Paragraph, Row, Scrollbar, ScrollbarOrientation,
        ScrollbarState, Table, Tabs,
    },
    Frame, Terminal,
};

use crate::parquet_ops;
use crate::utils;

struct App {
    input_dir: PathBuf,
    parquet_files: Vec<PathBuf>,
    selected_file_index: usize,
    selected_tab: usize,
    current_batch: Option<RecordBatch>,
    current_row: usize,
    scroll_offset: usize,
    file_browser_scroll: usize,
    max_rows_per_page: usize,
}

impl App {
    fn new(input_dir: PathBuf) -> Result<Self> {
        let parquet_files = parquet_ops::find_parquet_files(&input_dir, true, None)?;

        Ok(Self {
            input_dir,
            parquet_files,
            selected_file_index: 0,
            selected_tab: 0,
            current_batch: None,
            current_row: 0,
            scroll_offset: 0,
            file_browser_scroll: 0,
            max_rows_per_page: 20,
        })
    }

    fn load_selected_file(&mut self) -> Result<()> {
        if self.parquet_files.is_empty() {
            return Ok(());
        }

        let selected_file = &self.parquet_files[self.selected_file_index];
        let batches = parquet_ops::collect_record_batches(selected_file)?;

        if !batches.is_empty() {
            self.current_batch = Some(batches[0].clone());
            self.current_row = 0;
            self.scroll_offset = 0;
        } else {
            self.current_batch = None;
        }

        Ok(())
    }

    fn next_file(&mut self) -> Result<()> {
        if self.parquet_files.is_empty() {
            return Ok(());
        }

        self.selected_file_index = (self.selected_file_index + 1) % self.parquet_files.len();
        self.load_selected_file()?;

        // Ensure selection is visible after changing files
        self.ensure_selected_file_visible();

        Ok(())
    }

    fn prev_file(&mut self) -> Result<()> {
        if self.parquet_files.is_empty() {
            return Ok(());
        }

        self.selected_file_index = if self.selected_file_index == 0 {
            self.parquet_files.len() - 1
        } else {
            self.selected_file_index - 1
        };

        self.load_selected_file()?;

        // Ensure selection is visible after changing files
        self.ensure_selected_file_visible();

        Ok(())
    }

    fn next_row(&mut self) {
        if let Some(batch) = &self.current_batch {
            if self.current_row < batch.num_rows() - 1 {
                self.current_row += 1;

                // Adjust scroll if needed
                if self.current_row >= self.scroll_offset + self.max_rows_per_page {
                    self.scroll_offset = self.current_row - self.max_rows_per_page + 1;
                }
            }
        }
    }

    fn prev_row(&mut self) {
        if self.current_row > 0 {
            self.current_row -= 1;

            // Adjust scroll if needed
            if self.current_row < self.scroll_offset {
                self.scroll_offset = self.current_row;
            }
        }
    }

    fn next_tab(&mut self) {
        self.selected_tab = (self.selected_tab + 1) % 3; // We have 3 tabs

        // When switching to file browser, ensure selection is visible
        if self.selected_tab == 0 {
            self.ensure_selected_file_visible();
        }
    }

    fn prev_tab(&mut self) {
        self.selected_tab = if self.selected_tab == 0 {
            2 // We have 3 tabs
        } else {
            self.selected_tab - 1
        };

        // When switching to file browser, ensure selection is visible
        if self.selected_tab == 0 {
            self.ensure_selected_file_visible();
        }
    }

    fn scroll_file_browser_down(&mut self) {
        if !self.parquet_files.is_empty() {
            let visible_items = 20; // Approximate number of visible items
            let max_scroll = self.parquet_files.len().saturating_sub(visible_items);

            if self.file_browser_scroll < max_scroll {
                self.file_browser_scroll += 1;
            }
        }
    }

    fn scroll_file_browser_up(&mut self) {
        if self.file_browser_scroll > 0 {
            self.file_browser_scroll -= 1;
        }
    }

    // Ensure that the selected file is visible by adjusting scroll position
    fn ensure_selected_file_visible(&mut self) {
        if self.parquet_files.is_empty() {
            return;
        }

        // Find the index of the selected file in the tree view
        let selected_path = &self.parquet_files[self.selected_file_index];
        let mut selected_tree_index = 0;

        // Build directory-to-files map to find the position
        let mut dir_map: std::collections::HashMap<PathBuf, Vec<PathBuf>> =
            std::collections::HashMap::new();
        let mut all_dirs: Vec<PathBuf> = Vec::new();

        // Group files by directory
        for path in &self.parquet_files {
            if let Some(parent) = path.parent() {
                let parent_path = parent.to_path_buf();
                dir_map
                    .entry(parent_path.clone())
                    .or_insert_with(Vec::new)
                    .push(path.clone());

                if !all_dirs.contains(&parent_path) {
                    all_dirs.push(parent_path);
                }
            }
        }

        // Sort directories for consistent display
        all_dirs.sort();

        // Calculate selected index in tree
        let mut current_index = 0;

        for dir in all_dirs.iter() {
            // Skip the directory entry itself
            current_index += 1;

            if let Some(files) = dir_map.get(dir) {
                let mut sorted_files = files.clone();
                sorted_files.sort();

                for path in sorted_files.iter() {
                    if path == selected_path {
                        selected_tree_index = current_index;
                        break;
                    }
                    current_index += 1;
                }
            }

            if selected_tree_index > 0 {
                break; // Found the selected file, no need to continue
            }
        }

        // Adjust scroll position to make selected file visible
        let visible_height = 20; // Approximate visible height

        if selected_tree_index < self.file_browser_scroll {
            // Selected file is above visible area, scroll up
            self.file_browser_scroll = selected_tree_index;
        } else if selected_tree_index >= self.file_browser_scroll + visible_height {
            // Selected file is below visible area, scroll down
            self.file_browser_scroll = selected_tree_index.saturating_sub(visible_height) + 1;
        }
    }
}

pub fn run_tui_app(input_dir: PathBuf) -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app state
    let mut app = App::new(input_dir)?;
    if !app.parquet_files.is_empty() {
        app.load_selected_file()?;
    }

    // Main loop
    let res = run_app(&mut terminal, &mut app);

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    if let Err(err) = res {
        println!("Error: {}", err);
    }

    Ok(())
}

fn run_app<B: Backend>(terminal: &mut Terminal<B>, app: &mut App) -> Result<()> {
    // Ensure selection is initially visible
    if !app.parquet_files.is_empty() {
        app.ensure_selected_file_visible();
    }

    loop {
        terminal.draw(|f| ui(f, app))?;

        if crossterm::event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    match key.code {
                        KeyCode::Char('q') => return Ok(()),
                        KeyCode::Tab => app.next_tab(),
                        KeyCode::BackTab => app.prev_tab(),
                        KeyCode::Right => app.next_file()?,
                        KeyCode::Left => app.prev_file()?,
                        KeyCode::Down => {
                            if app.selected_tab == 0 {
                                app.scroll_file_browser_down();
                            } else {
                                app.next_row();
                            }
                        }
                        KeyCode::Up => {
                            if app.selected_tab == 0 {
                                app.scroll_file_browser_up();
                            } else {
                                app.prev_row();
                            }
                        }
                        KeyCode::PageDown => {
                            if app.selected_tab == 0 {
                                for _ in 0..10 {
                                    app.scroll_file_browser_down();
                                }
                            } else {
                                for _ in 0..10 {
                                    app.next_row();
                                }
                            }
                        }
                        KeyCode::PageUp => {
                            if app.selected_tab == 0 {
                                for _ in 0..10 {
                                    app.scroll_file_browser_up();
                                }
                            } else {
                                for _ in 0..10 {
                                    app.prev_row();
                                }
                            }
                        }
                        // Add home and end keys for quicker navigation
                        KeyCode::Home => {
                            if app.selected_tab == 0 {
                                app.file_browser_scroll = 0;
                            } else if app.current_batch.is_some() {
                                app.current_row = 0;
                                app.scroll_offset = 0;
                            }
                        }
                        KeyCode::End => {
                            if app.selected_tab == 0 && !app.parquet_files.is_empty() {
                                // Approximate scroll to end
                                app.file_browser_scroll =
                                    app.parquet_files.len().saturating_sub(10);
                            } else if let Some(batch) = &app.current_batch {
                                if batch.num_rows() > 0 {
                                    app.current_row = batch.num_rows() - 1;
                                    app.scroll_offset =
                                        app.current_row.saturating_sub(app.max_rows_per_page) + 1;
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }
}

fn ui(f: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .margin(1)
        .constraints([Constraint::Length(3), Constraint::Min(0)])
        .split(f.area());

    // Tabs
    let titles: Vec<_> = ["File Browser", "Record View", "Help"]
        .iter()
        .map(|t| Line::from(*t))
        .collect();

    let tabs = Tabs::new(titles)
        .block(Block::default().borders(Borders::ALL).title("Tabs"))
        .select(app.selected_tab)
        .style(Style::default().fg(Color::White))
        .highlight_style(Style::default().fg(Color::Yellow));

    f.render_widget(tabs, chunks[0]);

    match app.selected_tab {
        0 => render_file_browser(f, app, chunks[1]),
        1 => render_record_view(f, app, chunks[1]),
        2 => render_help(f, app, chunks[1]),
        _ => {}
    }
}

fn render_file_browser(f: &mut Frame, app: &App, area: Rect) {
    // Create map of directories to files
    let mut dir_map: std::collections::HashMap<PathBuf, Vec<PathBuf>> =
        std::collections::HashMap::new();
    let mut all_dirs: Vec<PathBuf> = Vec::new();

    // Group files by directory
    for path in &app.parquet_files {
        if let Some(parent) = path.parent() {
            let parent_path = parent.to_path_buf();
            dir_map
                .entry(parent_path.clone())
                .or_insert_with(Vec::new)
                .push(path.clone());

            if !all_dirs.contains(&parent_path) {
                all_dirs.push(parent_path);
            }
        }
    }

    // Sort directories for consistent display
    all_dirs.sort();

    // Build tree items
    let mut items: Vec<ListItem> = Vec::new();
    let mut current_idx = 0;

    for dir in all_dirs.iter() {
        // Create directory line
        let dir_display = if let Some(name) = dir.file_name() {
            name.to_string_lossy().to_string()
        } else {
            dir.display().to_string()
        };

        let dir_line = Line::from(vec![
            Span::styled("📁 ", Style::default().fg(Color::Yellow)),
            Span::styled(
                dir_display,
                Style::default()
                    .fg(Color::Blue)
                    .add_modifier(Modifier::BOLD),
            ),
        ]);

        items.push(ListItem::new(dir_line));
        current_idx += 1;

        // Create file lines for this directory
        if let Some(files) = dir_map.get(dir) {
            let mut sorted_files = files.clone();
            sorted_files.sort();

            for path in sorted_files.iter() {
                let global_file_idx = app
                    .parquet_files
                    .iter()
                    .position(|p| p == path)
                    .unwrap_or(0);
                let filename = path.file_name().unwrap_or_default().to_string_lossy();

                let is_selected = global_file_idx == app.selected_file_index;

                let style = if is_selected {
                    Style::default().fg(Color::Yellow).bg(Color::DarkGray)
                } else {
                    Style::default()
                };

                let heart = if is_selected { "♥ " } else { "  " };
                let file_line = Line::from(vec![
                    Span::styled("   └─ ", Style::default().fg(Color::DarkGray)),
                    Span::styled(heart, Style::default().fg(Color::Red)),
                    Span::styled(format!("{}", filename), style),
                    Span::styled(" | ", Style::default().fg(Color::DarkGray)),
                    Span::styled(
                        format!("path: {}", path.display()),
                        Style::default().fg(Color::DarkGray),
                    ),
                ]);

                items.push(ListItem::new(file_line).style(style));
                current_idx += 1;
            }
        }
    }

    // Calculate visible range based on scroll position
    let start_idx = app.file_browser_scroll;
    let list_height = area.height as usize;
    let end_idx = std::cmp::min(start_idx + list_height, items.len());

    // Create scrollable list
    let items_slice = items
        .clone()
        .into_iter()
        .skip(start_idx)
        .take(end_idx - start_idx)
        .collect::<Vec<_>>();

    let list = List::new(items_slice)
        .block(
            Block::default()
                .title(format!(
                    "Parquet Files ({} files, {} dirs)",
                    app.parquet_files.len(),
                    all_dirs.len()
                ))
                .borders(Borders::ALL),
        )
        .highlight_style(Style::default().fg(Color::Yellow).bg(Color::DarkGray));

    // Render list
    f.render_widget(list, area);

    // Render scrollbar if needed
    if items.clone().len() > list_height {
        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .begin_symbol(Some("↑"))
            .end_symbol(Some("↓"));

        let scrollbar_state = ScrollbarState::new(items.len()).position(app.file_browser_scroll);

        // Overlay scrollbar
        f.render_stateful_widget(
            scrollbar,
            area.inner(Margin {
                vertical: 1,
                horizontal: 0,
            }),
            &mut scrollbar_state.clone(),
        );
    }
}

fn render_record_view(f: &mut Frame, app: &App, area: Rect) {
    let vertical_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(0)])
        .split(area);

    match &app.current_batch {
        Some(batch) => {
            // Header with metadata
            let metadata = utils::extract_metadata(batch.schema_ref());
            let mut header_text = vec![
                format!(
                    "File: {}",
                    app.parquet_files[app.selected_file_index].display()
                ),
                format!("Rows: {}", batch.num_rows()),
            ];

            if let Some(topic) = metadata.get("topic") {
                header_text.push(format!("Topic: {}", topic));
            }

            let header = Paragraph::new(header_text.join(" | "))
                .block(Block::default().title("Metadata").borders(Borders::ALL))
                .cyan();

            f.render_widget(header, vertical_chunks[0]);

            // Table with record data
            let schema = batch.schema();
            let headers: Vec<String> = schema
                .fields()
                .iter()
                .map(|f| f.name().to_string())
                .collect();

            let header_cells = headers.iter().map(|h| Cell::from(h.as_str()).yellow());
            let header = Row::new(header_cells);

            let visible_rows = std::cmp::min(
                app.max_rows_per_page,
                batch.num_rows().saturating_sub(app.scroll_offset),
            );

            let rows = (0..visible_rows).map(|i| {
                let row_idx = i + app.scroll_offset;
                let row_style = if row_idx == app.current_row {
                    Style::default().bg(Color::DarkGray)
                } else {
                    Style::default()
                };

                let cells = schema.fields().iter().enumerate().map(|(col_idx, _)| {
                    let col = batch.column(col_idx);
                    let value = utils::format_array_value(col, row_idx);
                    Cell::from(value)
                });

                Row::new(cells).style(row_style)
            });

            let table = Table::new(rows, headers.iter().map(|_| Constraint::Min(10)))
                .header(header)
                .block(Block::default().title("Record Data").borders(Borders::ALL))
                .row_highlight_style(Style::default().bg(Color::DarkGray))
                .widths(
                    &headers
                        .iter()
                        .map(|_| Constraint::Min(10))
                        .collect::<Vec<_>>(),
                );

            f.render_widget(table, vertical_chunks[1]);
        }
        None => {
            let message = if app.parquet_files.is_empty() {
                "No parquet files found in the input directory"
            } else {
                "Selected file contains no data"
            };

            let paragraph = Paragraph::new(message)
                .block(Block::default().title("Record View").borders(Borders::ALL))
                .red();

            f.render_widget(paragraph, area);
        }
    }
}

fn render_help(f: &mut Frame, _app: &App, area: Rect) {
    let help_text = vec![
        "Navigation Controls:",
        "",
        "q          - Quit",
        "Tab        - Next tab",
        "Shift+Tab  - Previous tab",
        "←/→        - Previous/Next file",
        "↑/↓        - Navigate rows/files",
        "Page Up/Dn - Scroll 10 items at a time",
        "Home       - Go to beginning",
        "End        - Go to end",
    ];

    let paragraph = Paragraph::new(help_text.join("\n"))
        .block(Block::default().title("Help").borders(Borders::ALL))
        .style(Style::default());

    f.render_widget(paragraph, area);
}
