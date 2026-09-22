import React from 'react';
import { Box, Typography } from '@mui/material';
import { moduleDisplayFor } from '../../workflow/moduleMap';

/**
 * The name a module answers by, rendered the one agreed way.
 *
 * Item T5: this used to take a single pre-uppercased string, so every module
 * shouted its name — "TXKG — TARGET IDENTIFICATION AGENT". The agreed form is
 * two lines: the module's own casing on top, the full agent name beneath it,
 * smaller and dimmer.
 *
 * Pass `moduleKey`; `label`/`role` remain only for a caller that has something
 * other than a registry module to name.
 */
const AgentHeader = ({ moduleKey, label, role, compact = false }) => {
  const fromRegistry = moduleKey ? moduleDisplayFor(moduleKey) : null;

  const name = label ?? fromRegistry?.label ?? '';
  const subtitle = role ?? fromRegistry?.role ?? null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        mb: compact ? '10px' : '16px',
      }}
    >
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '8px',
          bgcolor: '#F0FDF9',
          border: '1px solid #00BCD4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4" />
        </svg>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: "'Geist', sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            color: '#1E293B',
            lineHeight: 1.25,
          }}
        >
          {name}
        </Typography>

        {subtitle && (
          <Typography
            sx={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '11px',
              fontWeight: 400,
              color: '#94A3B8',
              lineHeight: 1.3,
            }}
          >
            ({subtitle})
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AgentHeader;
