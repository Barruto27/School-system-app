/**
 * Normalized page-space coordinates: fractions (0..1) of the page's
 * unrotated width/height at scale 1. Keeping annotations in this space
 * (rather than screen pixels) means they stay correct across zoom levels
 * and are reusable by later stages (freeform canvas, linking) without a
 * second coordinate system.
 */
export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  page: number;
  color: string;
  createdAt: number;
}

export interface StrokeAnnotation extends BaseAnnotation {
  type: 'draw' | 'highlight';
  points: Point[];
  /** Stroke width as a fraction of page width. */
  strokeWidth: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: Point;
  text: string;
  /** Font size as a fraction of page height. */
  fontSize: number;
}

export interface CommentAnnotation extends BaseAnnotation {
  type: 'comment';
  position: Point;
  text: string;
}

export type Annotation = StrokeAnnotation | TextAnnotation | CommentAnnotation;

export type AnnotationTool = 'select' | 'draw' | 'highlight' | 'text' | 'comment';
