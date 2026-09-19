'use client';

import React, { useState } from 'react';
import {
  Paper,
  Text,
  Group,
  Stack,
  Button,
  Select,
  Badge,
  ActionIcon,
  Box,
} from '@mantine/core';
import { IconPlus, IconTrash, IconClock } from '@tabler/icons-react';

export interface TimeBlock {
  id?: string;
  startTime: string; // "10:00"
  endTime: string;   // "13:00"
}

interface Props {
  dayName: string;
  blocks: TimeBlock[];
  onAddBlock: (startTime: string, endTime: string) => Promise<void>;
  onRemoveBlock: (id?: string) => Promise<void>;
}

export function RadialClockEditor({
  dayName,
  blocks,
  onAddBlock,
  onRemoveBlock,
}: Props) {
  const [newStart, setNewStart] = useState<string | null>('10:00');
  const [newEnd, setNewEnd] = useState<string | null>('13:00');
  const [adding, setAdding] = useState(false);

  // SVG parameters for the 24-hour astronomical instrument wheel
  const size = 320;
  const center = size / 2;
  const radius = 120;
  const strokeWidth = 14;

  // Time string "HH:mm" to angle in degrees (00:00 is top, clockwise 360 deg for 24 hours)
  const timeToAngle = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + (m || 0);
    return (totalMinutes / 1440) * 360;
  };

  // Convert polar coordinates to Cartesian
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  // Describe SVG arc
  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', r, r, 0, arcSweep, 0, end.x, end.y,
    ].join(' ');
  };

  const handleAdd = async () => {
    if (!newStart || !newEnd) return;
    setAdding(true);
    try {
      await onAddBlock(newStart, newEnd);
    } finally {
      setAdding(false);
    }
  };

  // Generate 24-hour options
  const timeOptions = Array.from({ length: 48 }).map((_, idx) => {
    const h = Math.floor(idx / 2).toString().padStart(2, '0');
    const m = (idx % 2 === 0 ? '00' : '30');
    return { value: `${h}:${m}`, label: `${h}:${m}` };
  });

  return (
    <Paper p="lg" className="astro-card">
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={600} size="lg" c="#E2E8F0">
            {dayName} Schedule
          </Text>
          <Text size="xs" c="dimmed">
            Radial astronomical 24-hour dial. {blocks.length} active block{blocks.length !== 1 ? 's' : ''}.
          </Text>
        </div>
        <Badge
          color={blocks.length > 0 ? 'brass' : 'gray'}
          variant="light"
          size="sm"
        >
          {blocks.length > 0 ? 'Consultations Active' : 'Day Off / Closed'}
        </Badge>
      </Group>

      <Group align="flex-start" justify="space-around" wrap="wrap">
        {/* Functional Radial Clock Dial */}
        <Box style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Outer hairline circle */}
            <circle
              cx={center}
              cy={center}
              r={radius + strokeWidth}
              fill="none"
              stroke="rgba(200, 155, 92, 0.2)"
              strokeWidth="1"
            />

            {/* Inner background dial ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#1A2035"
              strokeWidth={strokeWidth}
            />

            {/* 24-hour division tick marks & labels */}
            {Array.from({ length: 24 }).map((_, h) => {
              const angle = (h / 24) * 360;
              const innerTick = polarToCartesian(center, center, radius - strokeWidth / 2 - 4, angle);
              const outerTick = polarToCartesian(center, center, radius + strokeWidth / 2 + 4, angle);
              const labelPos = polarToCartesian(center, center, radius - 26, angle);

              return (
                <g key={h}>
                  <line
                    x1={innerTick.x}
                    y1={innerTick.y}
                    x2={outerTick.x}
                    y2={outerTick.y}
                    stroke={h % 6 === 0 ? '#C89B5C' : 'rgba(200, 155, 92, 0.3)'}
                    strokeWidth={h % 6 === 0 ? 2 : 1}
                  />
                  {h % 3 === 0 && (
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 3}
                      fill={h % 6 === 0 ? '#C89B5C' : '#94A3B8'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {h}:00
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Active Availability Blocks as Brass Arcs */}
            {blocks.map((block, idx) => {
              const startAngle = timeToAngle(block.startTime);
              let endAngle = timeToAngle(block.endTime);
              if (endAngle <= startAngle) endAngle += 360;

              const path = describeArc(center, center, radius, startAngle, endAngle);

              return (
                <path
                  key={idx}
                  d={path}
                  fill="none"
                  stroke="#C89B5C"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(200, 155, 92, 0.6))' }}
                />
              );
            })}

            {/* Center Astrological Hub */}
            <circle
              cx={center}
              cy={center}
              r={radius - 40}
              fill="#14192B"
              stroke="rgba(200, 155, 92, 0.25)"
              strokeWidth="1"
            />
            <circle
              cx={center}
              cy={center}
              r="4"
              fill="#C89B5C"
            />
          </svg>

          {/* Dial Center text */}
          <Box
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <IconClock size={20} color="#C89B5C" style={{ margin: '0 auto 2px' }} />
            <Text size="xs" fw={700} c="brass.4">
              24H DIAL
            </Text>
            <Text size="10px" c="dimmed">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </Text>
          </Box>
        </Box>

        {/* Time Blocks List & Form */}
        <Stack gap="sm" style={{ flex: 1, minWidth: 260 }}>
          <Text size="sm" fw={600} c="brass.4">
            Configured Time Blocks:
          </Text>

          {blocks.length === 0 ? (
            <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
              No availability set for {dayName}. Tap below to add consultation hours.
            </Text>
          ) : (
            <Stack gap="xs">
              {blocks.map((b, idx) => (
                <Paper
                  key={b.id || idx}
                  p="xs"
                  style={{
                    background: '#14192B',
                    border: '1px solid rgba(200, 155, 92, 0.2)',
                    borderRadius: 4,
                  }}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Box
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#C89B5C',
                        }}
                      />
                      <Text size="sm" fw={500}>
                        {b.startTime} — {b.endTime}
                      </Text>
                    </Group>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      onClick={() => onRemoveBlock(b.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}

          {/* Add block form */}
          <Paper p="sm" mt="xs" style={{ background: '#14192B', border: '1px dashed rgba(200, 155, 92, 0.3)' }}>
            <Text size="xs" fw={600} mb="xs" c="brass.5">
              + Add Another Time Block
            </Text>
            <Group grow mb="xs">
              <Select
                size="xs"
                label="Start"
                data={timeOptions}
                value={newStart}
                onChange={setNewStart}
                styles={{ input: { background: '#1A2035', color: '#E2E8F0' } }}
              />
              <Select
                size="xs"
                label="End"
                data={timeOptions}
                value={newEnd}
                onChange={setNewEnd}
                styles={{ input: { background: '#1A2035', color: '#E2E8F0' } }}
              />
            </Group>
            <Button
              size="xs"
              color="brass"
              fullWidth
              leftSection={<IconPlus size={14} />}
              onClick={handleAdd}
              loading={adding}
            >
              Add Block to {dayName}
            </Button>
          </Paper>
        </Stack>
      </Group>
    </Paper>
  );
}
