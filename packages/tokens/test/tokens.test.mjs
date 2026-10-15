import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors } from '../dist/colors.js';
import { typography } from '../dist/typography.js';
import { spacing } from '../dist/spacing.js';
import { motion } from '../dist/motion.js';
import { spatialRouting } from '../dist/routing.js';

test('design tokens export expected core palettes and properties', () => {
  assert.equal(colors.primary.indigo, '#1E3A8A');
  assert.equal(colors.status.success, '#10B981');
  assert.equal(colors.status.warning, '#F59E0B');
  assert.equal(colors.status.error, '#EF4444');
  assert.equal(colors.neutral.slate, '#64748B');
  assert.equal(colors.surfaces.background, '#F8FAFC');

  assert.ok(typography.fontFamilies.mono.includes('Roboto Mono') || typography.fontFamilies.mono.includes('SF Mono'));
  assert.equal(typography.fontSizes.base, 16);

  assert.equal(spacing.xs, 8);
  assert.equal(spacing.md, 16);
  assert.equal(spacing.lg, 24);

  assert.equal(motion.durations.normal, 300);

  // Spatial routing visual hierarchy
  assert.equal(spatialRouting.pedestrian.color, '#64748B');
  assert.equal(spatialRouting.pedestrian.dotDiameter, 4);
  assert.equal(spatialRouting.pedestrian.dotSpacing, 6);
  assert.equal(spatialRouting.convergenceNode.outerRingColor, '#1E3A8A');
  assert.equal(spatialRouting.convergenceNode.innerCoreColor, '#FFFFFF');
  assert.equal(spatialRouting.sharedCommute.color, '#1E3A8A');
});
