/**
 * Media types - Universal media asset abstraction
 *
 * These types provide a CMS-agnostic representation of media assets,
 * including images, videos, files, and their metadata/transformations.
 *
 * Abstracts:
 * - Sanity Image API
 * - Contentful Images API
 * - Cloudinary
 * - Imgix
 * - Generic CDN assets
 */

// Asset Types

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'file'

export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'avif' | 'svg' | 'bmp' | 'tiff'

export type VideoFormat = 'mp4' | 'webm' | 'ogg' | 'mov' | 'avi' | 'mkv'

export type ImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside'

export type CropStrategy =
  | 'center' | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'focal-point' | 'entropy' | 'attention'

export type PlaceholderType = 'lqip' | 'blurhash' | 'dominant-color' | 'blur' | 'solid'

// Base Media Asset

export interface BaseMediaAsset {
  _id?: string
  _type: MediaType
  url: string
  filename?: string
  mimeType: string
  size?: number
  uploadedAt?: string
  title?: string
  description?: string
  alt?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

// Image types

export interface ImageAsset extends BaseMediaAsset {
  _type: 'image'
  metadata?: ImageMetadata
  hotspot?: Hotspot
  crop?: Crop
}

export interface ImageMetadata {
  dimensions?: Dimensions
  lqip?: string
  blurhash?: string
  palette?: ColorPalette
  hasAlpha?: boolean
  isAnimated?: boolean
  format?: ImageFormat
  exif?: ExifData
  location?: GeoLocation
  [key: string]: unknown
}

export interface Dimensions {
  width: number
  height: number
  aspectRatio?: number
}

export interface Hotspot {
  x: number
  y: number
  width: number
  height: number
}

export interface Crop {
  top: number
  bottom: number
  left: number
  right: number
}

export interface ColorPalette {
  dominant?: ColorSwatch
  darkMuted?: ColorSwatch
  darkVibrant?: ColorSwatch
  lightMuted?: ColorSwatch
  lightVibrant?: ColorSwatch
  muted?: ColorSwatch
  vibrant?: ColorSwatch
  colors?: ColorSwatch[]
}

export interface ColorSwatch {
  background?: string
  foreground?: string
  title?: string
  population?: number
  rgb?: [number, number, number]
  hsl?: [number, number, number]
}

export interface ExifData {
  make?: string
  model?: string
  lens?: string
  iso?: number
  aperture?: number
  shutterSpeed?: number
  focalLength?: number
  flash?: boolean
  orientation?: number
  gpsLatitude?: number
  gpsLongitude?: number
  dateTaken?: string
  copyright?: string
  artist?: string
  [key: string]: unknown
}

// Video types

export interface VideoAsset extends BaseMediaAsset {
  _type: 'video'
  metadata?: VideoMetadata
  poster?: ImageAsset
  sources?: VideoSource[]
  tracks?: VideoTrack[]
}

export interface VideoMetadata {
  dimensions?: Dimensions
  duration?: number
  frameRate?: number
  codec?: string
  audioCodec?: string
  bitrate?: number
  format?: VideoFormat
  [key: string]: unknown
}

export interface VideoSource {
  url: string
  type: string
  quality?: string
  width?: number
  height?: number
}

export interface VideoTrack {
  url: string
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata'
  language: string
  label: string
  default?: boolean
}

// Audio types

export interface AudioAsset extends BaseMediaAsset {
  _type: 'audio'
  metadata?: AudioMetadata
}

export interface AudioMetadata {
  duration?: number
  bitrate?: number
  sampleRate?: number
  channels?: number
  codec?: string
  [key: string]: unknown
}

// File types

export interface FileAsset extends BaseMediaAsset {
  _type: 'document' | 'file'
  metadata?: FileMetadata
}

export interface FileMetadata {
  pageCount?: number
  format?: string
  [key: string]: unknown
}

export interface GeoLocation {
  latitude: number
  longitude: number
  altitude?: number
  name?: string
  city?: string
  country?: string
}

// Image Transformations

export interface ImageTransform {
  width?: number
  height?: number
  fit?: ImageFit
  crop?: CropStrategy
  quality?: number
  format?: ImageFormat
  dpr?: number
  blur?: number
  sharpen?: number
  brightness?: number
  contrast?: number
  saturation?: number
  rotate?: number
  flipHorizontal?: boolean
  flipVertical?: boolean
  background?: string
  auto?: boolean | ('format' | 'quality' | 'compress')[]
  [key: string]: unknown
}

// Responsive Images

export interface ResponsiveImage {
  src: string
  srcset?: ImageSource[]
  sizes?: string
  alt?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
  fetchPriority?: 'high' | 'low' | 'auto'
}

export interface ImageSource {
  url: string
  width?: number
  density?: number
}

// Union types

export type MediaAsset = ImageAsset | VideoAsset | AudioAsset | FileAsset

// Type guards

export function isImageAsset(asset: MediaAsset): asset is ImageAsset {
  return asset._type === 'image'
}

export function isVideoAsset(asset: MediaAsset): asset is VideoAsset {
  return asset._type === 'video'
}

export function isAudioAsset(asset: MediaAsset): asset is AudioAsset {
  return asset._type === 'audio'
}

export function isFileAsset(asset: MediaAsset): asset is FileAsset {
  return asset._type === 'file' || asset._type === 'document'
}

// Utility functions

export function calculateAspectRatio(dimensions: Dimensions): number {
  return dimensions.width / dimensions.height
}

export function getFitDimensions(
  original: Dimensions,
  maxWidth: number,
  maxHeight: number
): Dimensions {
  const aspectRatio = calculateAspectRatio(original)
  let width = original.width
  let height = original.height

  if (width > maxWidth) {
    width = maxWidth
    height = width / aspectRatio
  }

  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  return { width: Math.round(width), height: Math.round(height), aspectRatio }
}

export function generateSrcSet(sources: ImageSource[]): string {
  return sources.map(source => {
    if (source.density) return `${source.url} ${source.density}x`
    if (source.width) return `${source.url} ${source.width}w`
    return source.url
  }).join(', ')
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  const decimals = unitIndex === 0 ? 0 : 1
  return `${size.toFixed(decimals)} ${units[unitIndex]}`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function getContrastColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor)
  if (!rgb) return '#000000'
  const [r, g, b] = rgb.map(val => {
    const normalized = val / 255
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
