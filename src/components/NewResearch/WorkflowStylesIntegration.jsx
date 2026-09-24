/**
 * WORKFLOW STYLES INTEGRATION
 * 
 * This file demonstrates how to integrate the Figma-based CSS styles
 * with Material-UI components in the CompleteWorkflow component.
 */

import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { ExpandMoreOutlined } from '@mui/icons-material';
import './WorkflowStyles.css';

/**
 * EXAMPLE 1: Top Navigation Bar
 * Combines CSS classes for layout with Material-UI for typography
 */
export const TopNavBar = ({ breadcrumbs }) => (
  <div className="top-nav">
    <div className="session-breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          <Typography 
            className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
            component="span"
          >
            {crumb}
          </Typography>
          {index < breadcrumbs.length - 1 && (
            <Typography className="breadcrumb-separator" component="span">
              /
            </Typography>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

/**
 * EXAMPLE 2: Pill Tabs
 * Pure CSS implementation with React state
 */
export const PillTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: 'message-square' },
    { id: 'artifacts', label: 'Artifacts', badge: 1, icon: 'file-text' },
    { id: 'lineage', label: 'Lineage' }
  ];

  return (
    <div className="pill-tabs">
      {tabs.map(tab => (
        <div 
          key={tab.id}
          className={tab.id === 'chat' ? 'tab-chat' : `tab-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          style={{ cursor: 'pointer' }}
        >
          {tab.id === 'chat' && activeTab === 'chat' ? (
            <div className="chat-pill">
              <ChatIcon className="icon" />
              <span className="label">{tab.label}</span>
            </div>
          ) : (
            <>
              {tab.icon && <TabIcon name={tab.icon} />}
              <span className="label">{tab.label}</span>
              {tab.badge && (
                <div className="artifact-badge">
                  <span className="count">{tab.badge}</span>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * EXAMPLE 3: Vertical Stepper
 * Shows active, completed, and inactive states
 */
export const VerticalStepper = ({ steps, activeStep }) => (
  <div className="vertical-stepper">
    {steps.map((step, index) => {
      const isActive = index === activeStep;
      const isCompleted = index < activeStep;

      return (
        <React.Fragment key={step.id}>
          {isCompleted ? (
            // Completed step with checkmark
            <Box className="step-3-active-row">
              <Box sx={{ width: '20px', height: 0, borderTop: '1.5px solid #00BCD4' }} />
              <Box sx={{ 
                width: 24, height: 24, borderRadius: '50%', 
                bgcolor: '#00BCD4', display: 'flex', 
                alignItems: 'center', justifyContent: 'center' 
              }}>
                <Typography sx={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700 }}>
                  ✓
                </Typography>
              </Box>
              <Typography sx={{ 
                fontFamily: "'Inter',sans-serif", 
                fontSize: '15px', 
                fontWeight: 700, 
                color: '#00BCD4', 
                ml: '10px' 
              }}>
                {step.label}
              </Typography>
            </Box>
          ) : isActive ? (
            // Active step
            <div className="step-3-active-row">
              <div className="active-border" />
              <div className="dash-container-3">
                <div className="dash-3" />
              </div>
              <div className="active-content">
                <div className="badge-active">
                  <span className="badge-text">{step.number}</span>
                </div>
                <span className="text-3">{step.label}</span>
              </div>
            </div>
          ) : (
            // Inactive step
            <div className="step-4-row">
              <span className="text-4">{step.number} {step.label}</span>
            </div>
          )}

          {/* Connector dots */}
          {index < steps.length - 1 && (
            <div className={`connector-${index + 1}`}>
              <span className="connector-dot" />
              <span className="connector-dot" />
              <span className="connector-dot" />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/**
 * EXAMPLE 4: User Message Bubble
 * Chat message from user with proper styling
 */
export const UserMessage = ({ message, userName = "DR. PRIYA (YOU)" }) => (
  <div className="user-message-row">
    <div className="message-bubble">
      <div className="bubble-header">
        <span className="user-name">{userName}</span>
      </div>
      <p className="message-text">{message}</p>
    </div>
  </div>
);

/**
 * EXAMPLE 5: Agent Thinking Bubble
 * Shows agent processing state with animated dots
 */
export const AgentThinking = ({ status = "Searching biomedical databases..." }) => (
  <div className="agent-thinking-row">
    <div className="thinking-bubble">
      <div className="bubble-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div className="agent-avatar">
          <SparklesIcon className="icon" />
        </div>
        <span className="agent-name">DRP TXKG AGENT</span>
      </div>
      <div className="status-processing">
        <div className="spinner-container">
          <span className="spinner-dot" />
          <span className="spinner-dot" />
          <span className="spinner-dot" />
        </div>
        <span className="status-message">{status}</span>
      </div>
    </div>
  </div>
);

/**
 * EXAMPLE 6: Chat Input Bar
 * Input field with toolbar
 */
export const ChatInputBar = ({ 
  value, 
  onChange, 
  onSubmit, 
  onFocus, 
  onMicClick,
  placeholder = "Type @ for agents or ask a research question..." 
}) => (
  <div className="chat-input-bar-container">
    <div className="input-row">
      <input 
        type="text"
        className="chat-placeholder"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyPress={e => e.key === 'Enter' && onSubmit()}
      />
    </div>
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn-focus" onClick={onFocus}>
          <PlusIcon className="icon" />
        </button>
      </div>
      <div className="toolbar-right">
        <div className="mic-icon-container">
          <MicIcon className="mic-icon" onClick={onMicClick} />
        </div>
        <button className="btn-pause" onClick={onSubmit}>
          <div className="stop-square" />
        </button>
      </div>
    </div>
  </div>
);

/**
 * EXAMPLE 7: Branch Selector Dropdown
 * Material-UI Menu with CSS styling
 */
export const BranchSelector = ({ branches, selectedBranch, onChange, open, onToggle }) => (
  <div className="branch-group">
    <div className="branch-label">
      <span className="text">BRANCH</span>
    </div>
    <div 
      className="branch-selector" 
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
    >
      <GitBranchIcon className="icon" />
      <span className="name">{branches.find(b => b.id === selectedBranch)?.label || 'Main'}</span>
      <ExpandMoreOutlined sx={{ fontSize: 12, color: '#64748B' }} />
    </div>
    
    {/* Dropdown menu */}
    {open && (
      <Box sx={{
        position: 'absolute',
        top: '100%',
        right: 0,
        mt: 1,
        width: '320px',
        bgcolor: '#FFFFFF',
        borderRadius: '12px',
        p: '16px',
        boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
        zIndex: 1400
      }}>
        {branches.map(branch => (
          <Box 
            key={branch.id}
            onClick={() => { onChange(branch.id); onToggle(); }}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              p: '8px 0'
            }}
          >
            <Box sx={{
              width: 19,
              height: 19,
              borderRadius: '50%',
              bgcolor: selectedBranch === branch.id ? '#00BCD4' : 'transparent',
              border: selectedBranch === branch.id ? '2px solid #00BCD4' : '1.5px solid #CBD5E1'
            }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ 
                fontFamily: "'Inter',sans-serif", 
                fontSize: '13px', 
                fontWeight: 600,
                color: selectedBranch === branch.id ? '#00BCD4' : '#1E293B'
              }}>
                {branch.label}
              </Typography>
              <Typography sx={{ 
                fontFamily: "'Inter',sans-serif", 
                fontSize: '11px', 
                color: '#94A3B8' 
              }}>
                {branch.description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    )}
  </div>
);

/**
 * COMPLETE WORKFLOW LAYOUT
 * Shows how all components fit together
 */
export const WorkflowLayoutExample = () => {
  const [activeTab, setActiveTab] = React.useState('chat');
  const [activeStep, setActiveStep] = React.useState(0);
  const [selectedBranch, setSelectedBranch] = React.useState('main');
  const [branchOpen, setBranchOpen] = React.useState(false);

  const breadcrumbs = ['New Project', 'Type 2 Diabetes', 'JAK2 Query'];
  
  const steps = [
    { id: 1, number: '01', label: 'TxKG' },
    { id: 2, number: '02', label: 'LitMineX' },
    { id: 3, number: '03', label: 'CurateX' },
    { id: 4, number: '04', label: 'ScreenSuite' },
    { id: 5, number: '05', label: 'NovSearch' }
  ];

  const branches = [
    { id: 'main', label: 'Main', description: 'Main research path' },
    { id: 'alt-1', label: 'Alt · JAK2', description: 'Forked at Target identification' }
  ];

  return (
    <div className="main-workspace">
      {/* Top Navigation */}
      <TopNavBar breadcrumbs={breadcrumbs} />

      {/* App Toolbar */}
      <div className="app-toolbar">
        <div className="tabs-row">
          <div className="tabs-left">
            <PillTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <BranchSelector 
            branches={branches}
            selectedBranch={selectedBranch}
            onChange={setSelectedBranch}
            open={branchOpen}
            onToggle={() => setBranchOpen(!branchOpen)}
          />
        </div>
      </div>

      {/* Content with Stepper */}
      <div className="content-with-stepper">
        <VerticalStepper steps={steps} activeStep={activeStep} />
        
        <div className="main-content-area">
          <div className="chat-flow-container">
            <div className="messages-list">
              <UserMessage message="Find protein targets associated with Type 2 Diabetes for drug repurposing" />
              <AgentThinking status="Searching biomedical databases (NCBI, UniProt, TxKG relations)..." />
            </div>
            
            <ChatInputBar 
              value=""
              onChange={() => {}}
              onSubmit={() => {}}
              onFocus={() => {}}
              onMicClick={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ICON COMPONENTS (Placeholders - replace with actual icons)
 */
const ChatIcon = (props) => (
  <svg {...props} width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1" y="1" width="10" height="7" rx="1.5" stroke="#FFFFFF" strokeWidth="1.2"/>
    <path d="M3 11L6 8H10" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const SparklesIcon = (props) => (
  <svg {...props} width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/>
  </svg>
);

const PlusIcon = (props) => (
  <svg {...props} width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 3V11M3 7H11" stroke="#475569" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MicIcon = (props) => (
  <svg {...props} width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="6" y="2" width="4" height="7" rx="2" stroke="#94A3B8" strokeWidth="1.2"/>
    <path d="M4 8C4 10.2 5.8 12 8 12C10.2 12 12 10.2 12 8M8 12V14" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const GitBranchIcon = (props) => (
  <svg {...props} width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="3" cy="3" r="1.5" stroke="#64748B" strokeWidth="1.2"/>
    <circle cx="9" cy="3" r="1.5" stroke="#64748B" strokeWidth="1.2"/>
    <circle cx="3" cy="9" r="1.5" stroke="#64748B" strokeWidth="1.2"/>
    <path d="M3 4.5V7.5M3 4.5C5 4.5 7.5 4 7.5 3" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const TabIcon = ({ name }) => <div style={{ width: 14, height: 14 }} />;

export default WorkflowLayoutExample;
