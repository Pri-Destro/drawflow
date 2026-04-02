"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@repo/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';
import { Plus, Pen, Calendar, Users, MoveVertical as MoreVertical, Search, Grid2x2 as Grid, List, LogOut, Settings, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Project, User } from '@repo/common/types';
import Link from 'next/link';

interface DashboardProps {
    projects : Project[],
    user : User
}

export default function DashboardClient({ user, projects }: DashboardProps) {

  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>(projects ?? []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);

    try {
      const response = await axios.post("/api/projects", {
        roomName : newProjectName.trim()
      })


      const roomId = response.data?.roomId;
      if (!roomId) throw new Error("No roomId returned");
      
      const newProject: Project = {
        roomId,
        name: newProjectName.trim(),
        createdAt: new Date().toISOString(),
        collaborators: 1
      };

      setProjectList(prev => [newProject, ...prev]);
      setNewProjectName('');
      setShowCreateForm(false);

      router.push(`/canvas/${roomId}`);

    }catch (error) {
      console.error('Failed to create project:', error);
      
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Add logout API call here if needed
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const filteredProjects = projectList.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-sm ${
        isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white/50'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Pen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">DrawFlow</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleDarkMode}
                className={`p-2 ${
                  isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                }`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              
              {/* <Button variant="ghost" size="sm" className="p-2">
                <Settings className="w-5 h-5" />
              </Button> */}
              
              <Button 
                variant="ghost"
                size="sm" 
                onClick={handleLogout}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-5 h-5" />
              </Button>
              
              {user && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium hidden md:block">{user.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back {`${user?.name}`}!
          </h1>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Manage your projects and continue creating amazing workflows.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className={`p-2 ${
                isDarkMode 
                  ? 'border-slate-600 hover:bg-slate-800' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <Card className={`mb-8 ${
            isDarkMode 
              ? 'bg-slate-800/50 border-slate-700' 
              : 'bg-white/80 border-gray-200'
          }`}>
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  autoFocus
                />
                <Button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreating}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewProjectName('');
                  }}
                  className={isDarkMode 
                    ? 'border-slate-600 hover:bg-slate-800' 
                    : 'border-gray-300 hover:bg-gray-50'
                  }
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid/List */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className={`w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 opacity-50`}>
              <Pen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'No projects found' : 'No projects yet'}
            </h3>

            {!searchTerm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
          }>
            {filteredProjects.map((project) => (
              <Card key={project.roomId} className={`group cursor-pointer transition-all duration-300 hover:transform hover:scale-105 ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50' 
                  : 'bg-white/80 border-gray-200 hover:border-indigo-300 hover:shadow-lg'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {project.name}
                      </CardTitle>
                      <div className={`flex items-center space-x-4 text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {project.collaborators ?? 1}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`aspect-video rounded-lg border-2 border-dashed flex items-center justify-center mb-4 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-700/30' 
                      : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div className={`text-center ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <Pen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Canvas Preview</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Unknown"}
                    </span>
                    <Button 
                      size="default" 
                      variant="outline" 
                      onClick={() => router.push(`/canvas/${project.roomId}`)}
                      className={`text-xs ${
                        isDarkMode 
                          ? 'border-slate-600 hover:bg-slate-700' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}