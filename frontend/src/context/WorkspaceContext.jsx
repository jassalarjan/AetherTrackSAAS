import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

/**
 * Workspace Context
 * 
 * Manages workspace-related state for the application
 * Provides workspace information and feature flags to components
 * 
 * WORKSPACE TYPES:
 * - CORE: Full-featured enterprise workspace (no limits)
 * - COMMUNITY: Free workspace with limited features and usage limits
 */

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [workspace, setWorkspace] = useState({
    id: null,
    name: null,
    type: null,
    features: {},
    limits: {},
    usage: {},
  });

  const [isLoading, setIsLoading] = useState(true);

  // Initialize workspace from localStorage on mount
  useEffect(() => {
    const storedWorkspace = localStorage.getItem('workspace');
    if (storedWorkspace) {
      try {
        const parsed = JSON.parse(storedWorkspace);
        setWorkspace(parsed);
      } catch (error) {
        console.error('Failed to parse stored workspace:', error);
        localStorage.removeItem('workspace');
      }
    }
    setIsLoading(false);
  }, []);

  // Update workspace when user changes
  useEffect(() => {
    if (user && user.workspace) {
      updateWorkspace(user.workspace);
    } else if (!user) {
      clearWorkspace();
    }
  }, [user]);

  /**
   * Update workspace information
   * @param {Object} workspaceData - Workspace data from API
   */
  const updateWorkspace = (workspaceData) => {
    const newWorkspace = {
      id: workspaceData.id,
      name: workspaceData.name,
      type: workspaceData.type,
      features: workspaceData.features || {},
      limits: workspaceData.limits || {},
      usage: workspaceData.usage || {},
    };
    
    setWorkspace(newWorkspace);
    localStorage.setItem('workspace', JSON.stringify(newWorkspace));
  };

  /**
   * Clear workspace data (on logout)
   */
  const clearWorkspace = () => {
    setWorkspace({
      id: null,
      name: null,
      type: null,
      features: {},
      limits: {},
      usage: {},
    });
    localStorage.removeItem('workspace');
  };

  /**
   * Check if current workspace is CORE
   * @returns {boolean}
   */
  const isCore = () => {
    return workspace.type === 'CORE';
  };

  /**
   * Check if current workspace is COMMUNITY
   * @returns {boolean}
   */
  const isCommunity = () => {
    return workspace.type === 'COMMUNITY';
  };

  /**
   * Check if workspace has a specific feature enabled
   * @param {string} featureName - Feature name (e.g., 'bulkUserImport', 'auditLogs')
   * @returns {boolean}
   */
  const hasFeature = (featureName) => {
    return workspace.features?.[featureName] === true;
  };

  /**
   * Check if workspace can add more users
   * @returns {boolean}
   */
  const canAddUser = () => {
    if (isCore() || !workspace.limits?.maxUsers) return true;
    return (workspace.usage?.userCount || 0) < workspace.limits.maxUsers;
  };

  /**
   * Check if workspace can add more tasks
   * @returns {boolean}
   */
  const canAddTask = () => {
    if (isCore() || !workspace.limits?.maxTasks) return true;
    return (workspace.usage?.taskCount || 0) < workspace.limits.maxTasks;
  };

  /**
   * Check if workspace can add more teams
   * @returns {boolean}
   */
  const canAddTeam = () => {
    if (isCore() || !workspace.limits?.maxTeams) return true;
    return (workspace.usage?.teamCount || 0) < workspace.limits.maxTeams;
  };

  /**
   * Get remaining capacity for a resource
   * @param {string} resource - 'users', 'tasks', or 'teams'
   * @returns {number|null} - Remaining count, or null if unlimited
   */
  const getRemainingCapacity = (resource) => {
    if (isCore()) return null; // Unlimited
    
    const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
    const usageKey = `${resource}Count`;
    
    const limit = workspace.limits?.[limitKey];
    const current = workspace.usage?.[usageKey] || 0;
    
    if (limit === null || limit === undefined) return null;
    return Math.max(0, limit - current);
  };

  /**
   * Check if approaching limit (within 80%)
   * @param {string} resource - 'users', 'tasks', or 'teams'
   * @returns {boolean}
   */
  const isApproachingLimit = (resource) => {
    if (isCore()) return false;
    
    const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
    const usageKey = `${resource}Count`;
    
    const limit = workspace.limits?.[limitKey];
    const current = workspace.usage?.[usageKey] || 0;
    
    if (!limit) return false;
    return current >= (limit * 0.8);
  };

  /**
   * Get workspace display badge
   * @returns {Object} - { text, color }
   */
  const getWorkspaceBadge = () => {
    if (isCore()) {
      return { text: 'CORE', color: 'blue' };
    } else if (isCommunity()) {
      return { text: 'COMMUNITY', color: 'green' };
    }
    return { text: 'Unknown', color: 'gray' };
  };

  const value = {
    workspace,
    isLoading,
    updateWorkspace,
    clearWorkspace,
    
    // Helper methods
    isCore,
    isCommunity,
    hasFeature,
    canAddUser,
    canAddTask,
    canAddTeam,
    getRemainingCapacity,
    isApproachingLimit,
    getWorkspaceBadge,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

/**
 * Hook to use workspace context
 * @returns {Object} Workspace context value
 */
export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;
