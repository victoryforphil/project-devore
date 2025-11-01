/**
 * Centralized type definitions for the application
 */

import type { Schema, Field } from 'apache-arrow'

// File System Types
export interface FileSystemItem {
  path: string
  name: string
  isDirectory: boolean
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
}

// Parquet Metadata Types
export interface ParquetFileMetadata {
  path: string
  name: string
  numRows?: number
  numColumns?: number
  fileSize?: number
  createdBy?: string
  version?: string
  schema?: Schema
  columns: ParquetColumnMetadata[]
  rawMetadata?: Record<string, any>
}

export interface ParquetColumnMetadata {
  name: string
  type: string
  field?: Field
  nullable?: boolean
  metadata?: Record<string, any>
}

// Selection Types
export type SelectionType = 'file' | 'column' | 'columns' | null

export interface FileSelection {
  type: 'file'
  filePath: string
  fileName: string
  schema?: Schema
  metadata?: ParquetFileMetadata
}

export interface ColumnSelection {
  type: 'column'
  filePath: string
  columnName: string
  columnType: string
  field?: Field
  fileMetadata?: ParquetFileMetadata
}

export interface SelectedColumn {
  filePath: string
  columnName: string
  columnType: string
  field?: Field
  visible: boolean
}

export interface MultiColumnSelection {
  type: 'columns'
  columns: SelectedColumn[]
  fileMetadata?: ParquetFileMetadata
  axisMapping?: AxisMapping
}

export interface AxisMapping {
  x: string | null
  y: string | null
  z: string | null
  scale: number
}

export type Selection = FileSelection | ColumnSelection | MultiColumnSelection | null

// Tree Node Types
export interface TreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  children?: TreeNode[]
  metadata?: ParquetFileMetadata
  level: number
}
