# Table Image Preview Design

## Goal

Make every table image column easy to scan and allow users to open the full
image without duplicating preview behavior across table-source components.

## Design

`GenericTable` remains the single owner of table-image rendering and modal
state. Image columns render a 64 by 64 pixel rectangular thumbnail with
rounded corners and `object-cover`. The thumbnail is a keyboard-accessible
button with a visible focus state and an accessible label.

Both `GenericPaginatedPage` and `GenericUnpaginatedPage` mark configured
`type: "image"` columns as image columns instead of installing their own small
custom image node. This routes schema images and workflow/pipeline synthetic
image columns through the same `GenericTable` behavior.

The existing `ImageModal` becomes an accessible lightbox:

- full-screen dark backdrop;
- image constrained to 90% viewport width and 85% viewport height;
- `object-contain` so the full image remains visible;
- close on backdrop click, Escape, or a visible close button;
- image/content clicks do not close the modal;
- dialog semantics and accessible labels.

Missing image values continue to use the existing image placeholder.

## Error Handling

Thumbnail and preview image load failures fall back to the existing placeholder
asset. Opening or closing the preview does not alter table selection or row
actions.

## Testing

Add focused component tests, where supported by the current test setup, for:

- configured image columns being marked as images in both page variants;
- a 64px thumbnail opening the modal;
- backdrop, Escape, and close-button dismissal;
- content clicks not dismissing the modal.

Run the repository test suite and production build. No API or backend changes
are required.
