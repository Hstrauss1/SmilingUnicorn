/**
 * Database helper functions for Supabase operations
 * Use these functions to interact with your database
 */

import { createClient } from './client';

// ============================================
// USER PROFILE OPERATIONS
// ============================================

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, updates) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// LEARNING ROADMAP OPERATIONS
// ============================================

/**
 * Create a new learning roadmap
 */
export async function createRoadmap(roadmapData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('learning_roadmaps')
    .insert({
      user_id: user.id,
      ...roadmapData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all roadmaps for current user
 */
export async function getUserRoadmaps() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('learning_roadmaps')
    .select(`
      *,
      roadmap_modules (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get a specific roadmap by ID with all modules
 */
export async function getRoadmapById(roadmapId) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('learning_roadmaps')
    .select(`
      *,
      roadmap_modules (*)
    `)
    .eq('id', roadmapId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update roadmap progress
 */
export async function updateRoadmapProgress(roadmapId, progress) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('learning_roadmaps')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', roadmapId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update roadmap status
 */
export async function updateRoadmapStatus(roadmapId, status) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('learning_roadmaps')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', roadmapId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a roadmap
 */
export async function deleteRoadmap(roadmapId) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('learning_roadmaps')
    .delete()
    .eq('id', roadmapId);

  if (error) throw error;
  return true;
}

// ============================================
// MODULE OPERATIONS
// ============================================

/**
 * Create modules for a roadmap
 */
export async function createModules(roadmapId, modulesData) {
  const supabase = createClient();
  
  const modulesWithRoadmap = modulesData.map((module, index) => ({
    roadmap_id: roadmapId,
    order_index: index,
    ...module
  }));

  const { data, error } = await supabase
    .from('roadmap_modules')
    .insert(modulesWithRoadmap)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Update module progress and status
 */
export async function updateModuleProgress(moduleId, progress, status) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('roadmap_modules')
    .update({ 
      progress, 
      status,
      updated_at: new Date().toISOString() 
    })
    .eq('id', moduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all modules for a roadmap
 */
export async function getRoadmapModules(roadmapId) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('roadmap_modules')
    .select('*')
    .eq('roadmap_id', roadmapId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data;
}

// ============================================
// STORAGE OPERATIONS
// ============================================

/**
 * Upload a document to storage
 */
export async function uploadDocument(file, userId) {
  const supabase = createClient();
  
  // Create unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  return {
    path: data.path,
    url: publicUrl,
    name: file.name
  };
}

/**
 * Delete a document from storage
 */
export async function deleteDocument(filePath) {
  const supabase = createClient();
  
  const { error } = await supabase.storage
    .from('documents')
    .remove([filePath]);

  if (error) throw error;
  return true;
}

/**
 * Get signed URL for private document
 */
export async function getDocumentSignedUrl(filePath, expiresIn = 3600) {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * Get user statistics
 */
export async function getUserStats(userId) {
  const supabase = createClient();
  
  // Get total roadmaps
  const { count: totalRoadmaps } = await supabase
    .from('learning_roadmaps')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get completed roadmaps
  const { count: completedRoadmaps } = await supabase
    .from('learning_roadmaps')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  // Get total modules completed
  const { data: roadmaps } = await supabase
    .from('learning_roadmaps')
    .select('id')
    .eq('user_id', userId);

  const roadmapIds = roadmaps?.map(r => r.id) || [];

  const { count: completedModules } = await supabase
    .from('roadmap_modules')
    .select('*', { count: 'exact', head: true })
    .in('roadmap_id', roadmapIds)
    .eq('status', 'completed');

  // Calculate total learning hours (estimate: 2 hours per completed module)
  const learningHours = (completedModules || 0) * 2;

  return {
    totalRoadmaps: totalRoadmaps || 0,
    completedRoadmaps: completedRoadmaps || 0,
    completedModules: completedModules || 0,
    learningHours
  };
}
