import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, Button, Avatar, IconButton } from '@mui/material';
import { CloseOutlined } from '@mui/icons-material';
import { useCurrentUser } from '../../context/CurrentUserContext';

/**
 * Share a research session.
 *
 * Testing (2026-10-13): Send and Copy link did nothing. Copy link now copies
 * a URL that reopens this session (…/workflow?session=<id>). Email invites
 * need a backend share service, which doesn't exist yet, so Send is disabled
 * and says so instead of appearing to work.
 */
export default function ShareModal({ open, onClose, sessionId = null, sessionTitle = '' }) {
  // Review point 6: the access list was three invented researchers with
  // "Dr. Priya Sharma" as the owner. The owner row is now the signed-in user.
  // There is no collaborators endpoint yet, so the list is just the owner.
  const { displayName, initials, email } = useCurrentUser();

  const [copyState, setCopyState] = useState(null);
  useEffect(() => {
    if (open) setCopyState(null);
  }, [open]);

  const link = sessionId
    ? `${window.location.origin}/#/dashboard/new-research/workflow?session=${encodeURIComponent(sessionId)}`
    : null;

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
    } catch {
      // Clipboard blocked (e.g. not a secure context): show the link instead.
      setCopyState('manual');
    }
  };

  const people = [
    {
      id: 'owner',
      initials: initials || '—',
      name: displayName,
      email: email || '',
      role: 'Owner',
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>Share Research Session</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseOutlined />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Add people by name or email..."
            size="small"
            disabled
          />
          <Button variant="contained" color="primary" disabled sx={{ bgcolor: '#00BCD4', textTransform: 'none' }}>Send</Button>
        </Box>
        <Typography sx={{ fontSize: 12, color: '#B45309', mt: -1, mb: 2 }}>
          Email invitations aren't available yet: there is no sharing service on the server, so nobody else can be given access.
          Copy link opens this session for you, for example on another device.
        </Typography>

        <Typography sx={{ fontSize: 13, color: '#64748B', mb: 1 }}>People with access</Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {people.map(p => (
            <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1, bgcolor: '#fff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#06B6D4', width: 36, height: 36 }}>{p.initials}</Avatar>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>{p.email}</Typography>
                </Box>
              </Box>
              <Box>
                <Box sx={{ px: 1.5, py: 0.5, bgcolor: '#F1F5F9', borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, color: '#475569' }}>{p.role}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ borderTop: '1px solid #E6EEF4', mt: 2, pt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Button variant="text" onClick={copyLink} disabled={!link} sx={{ color: '#00BCD4', textTransform: 'none' }}>Copy link</Button>
            {copyState === 'copied' && <Typography sx={{ fontSize: 12, color: '#15803D' }}>Link copied</Typography>}
            {copyState === 'manual' && (
              <TextField
                size="small"
                value={link}
                onFocus={(e) => e.target.select()}
                inputProps={{ readOnly: true, 'aria-label': sessionTitle ? `Link to ${sessionTitle}` : 'Session link', style: { fontSize: 12 } }}
                sx={{ minWidth: 260 }}
              />
            )}
          </Box>
          <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#00BCD4', color: '#fff', textTransform: 'none' }}>Done</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
