---
title: UX Playbook MOC
type: MOC
status: living
updated: 2026-09-24
tags: [bookflow, ux, design, moc]
---

# UX Playbook MOC

How Bookflow looks, moves, lays out, and stays accessible.

## Notes

- [[Design Tokens]] - colour, space, radius, shadow, duration, and spring tokens
- [[Screen Architectures]] - landing, reader shell, drawers, sheets, focus card
- [[Motion and Transitions]] - duration scale, spring usage, reduced motion
- [[Premium Micro-interactions]] - build-ready specs for polish features
- [[Accessibility Rules]] - targets, names, focus order, contrast
- [[Responsive Breakpoints]] - desktop, tablet, mobile behaviour and overflow rules
- [[Figma Inspection Evidence]] - inspected Figma file keys, node IDs, and measured values
- [[Home Widgets]] - Figma-derived home widget grid, geometry, and data bindings

## The design position

Calm, content-first, Apple-inspired in restraint rather than in imitation. Chrome recedes. Text
leads. Motion is felt more than seen. Nothing competes with the paragraph being read.

## Non-negotiables

| Rule | Value |
| --- | --- |
| Minimum touch target | `44 x 44` CSS px |
| Horizontal overflow | None from 320px to 430px |
| Reduced motion | Fully respected |
| Active-state signal | Never colour alone |
| Chrome at rest | Resume, chapter, progress, reader text, bookmark or note, settings |

## Token-first rule

Colour, spacing, radius, shadow, and duration live as CSS custom properties in `styles.css`.
Components consume tokens. Adding a one-off hex value or a magic pixel value is a defect.

Detail: [[Design Tokens]].

Related: [[Reader Engine MOC]], [[Accessibility Rules]], [[Premium Micro-interactions]].