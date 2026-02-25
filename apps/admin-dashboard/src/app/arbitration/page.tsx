'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// fetch live data
const fetchTasks = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/api/v1/arbitration/tasks`)
  return data
}

export default function ArbitrationPage() {
  const queryClient = useQueryClient()
  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['arbitration-tasks'],
    queryFn: fetchTasks,
    retry: 1
  })

  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [childException, setChildException] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  const isProcessingRef = useRef(false)
  const lastActionTimeRef = useRef(0)

  const mutation = useMutation({
    mutationFn: (decisionData: { id: string, decision: string, childException: boolean }) => {
      return axios.post(`${API_BASE_URL}/api/v1/arbitration/decide/${decisionData.id}`, {
        decision: decisionData.decision,
        child_passenger_exception: decisionData.childException
      })
    },
    onMutate: () => {
      isProcessingRef.current = true;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['arbitration-tasks'] })
      setSelectedTask(null)
      setChildException(false)

      // show success notification
      const action = variables.decision === 'approve' ? 'Approved & Pushed to VAHAN' : 'Rejected & Saved to Training Vault';
      setNotification({
        message: `Successfully processed: ${action}`,
        type: 'success'
      });

      // hide notification after 3s
      setTimeout(() => {
        setNotification(null)
      }, 3000)
    },
    onError: () => {
      setNotification({
        message: 'Failed to process decision. Please try again.',
        type: 'error'
      });

      setTimeout(() => {
        setNotification(null)
      }, 3000)
    },
    onSettled: () => {
      isProcessingRef.current = false;
    }
  })

  const handleDecision = (decision: 'approve' | 'reject') => {
    const now = Date.now();
    // 1000ms debounce
    if (now - lastActionTimeRef.current < 1000) {
      return;
    }

    if (!selectedTask || mutation.isPending || isProcessingRef.current) return;

    lastActionTimeRef.current = now;

    mutation.mutate({
      id: selectedTask.id,
      decision,
      childException
    })
  }

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTask || mutation.isPending || isProcessingRef.current) return;
      if (e.key === 'a' || e.key === 'A') {
        handleDecision('approve')
      } else if (e.key === 'r' || e.key === 'R') {
        handleDecision('reject')
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask, mutation.isPending, childException]);

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center h-screen bg-[#020617]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-16 w-16 bg-slate-800 rounded-2xl mb-4 border border-slate-700 shadow-2xl shadow-blue-500/20"></div>
        <div className="text-slate-400 font-medium tracking-widest text-xs uppercase">Initialising DTMS Vault...</div>
      </div>
    </div>
  )

  const hasConsensus = selectedTask?.system_violation && selectedTask?.system_violation === selectedTask?.officer_violation;

  const getStatusPill = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Pending Submit</span>
      case 'under_review':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Under Review</span>
      case 'resolved':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Resolved</span>
      case 'rejected':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Rejected</span>
      default:
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Unknown</span>
    }
  }

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden font-sans text-slate-200">
      {/* global nav */}
      <div className="w-20 bg-slate-950 border-r border-slate-800/50 flex flex-col items-center py-8 space-y-8 z-20">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <span className="font-black text-white text-xl italic">D</span>
        </div>
        <nav className="flex flex-col space-y-6">
          <div className="p-3 bg-slate-800/50 rounded-xl text-blue-400 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
          <div className="p-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-12 0v1zm0 0h6v-1a6 6 0 01-12 0v1zM11 2.457a4.002 4.002 0 017.773 2.586m-7.773 6.539a7.935 7.935 0 0110.146-2.937"></path></svg>
          </div>
          <div className="p-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
        </nav>
      </div>

      {/* toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center space-x-4 transition-all duration-500 transform ${notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200' : 'bg-red-500/20 border-red-500/30 text-red-200'}`}>
          <div className={`p-2 rounded-xl ${notification.type === 'success' ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
            )}
          </div>
          <span className="font-semibold tracking-tight">{notification.message}</span>
        </div>
      )}

      {/* task queue sidebar */}
      <div className="w-[420px] bg-slate-900/40 backdrop-blur-3xl border-r border-slate-800/50 flex flex-col z-10">
        <div className="p-8 border-b border-slate-800/50">
          <div className="flex justify-between items-center mb-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Arbitration Vault</h1>
            <div className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-xs font-mono text-blue-400">{(tasks as any[])?.length || 0}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Pending Enforcement Review</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 custom-scrollbar">
          {isError ? (
            <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-2xl">
              <p className="text-red-400 text-sm mb-4">Connection to DTMS Central severed.</p>
              <button onClick={() => refetch()} className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all font-bold text-xs uppercase tracking-widest">Re-establish Uplink</button>
            </div>
          ) : (!tasks || (tasks as any[]).length === 0) ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-slate-700/50">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">Clear Skies. All violations processed.</p>
            </div>
          ) : (
            (tasks as any[])?.map((task: any) => {
              const taskConsensus = task.system_violation && task.system_violation === task.officer_violation;
              const isSelected = selectedTask?.id === task.id;
              return (
                <div
                  key={task.id}
                  className={`p-6 cursor-pointer transition-all duration-300 rounded-2xl border ${isSelected ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5' : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600'}`}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs text-slate-500 font-mono block mb-1">VEHICLE ID</span>
                      <span className={`font-bold tracking-tight text-lg ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>{task.vehicle_number || 'UNKNOWN_PLATE'}</span>
                    </div>
                    {taskConsensus && (
                      <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col space-y-1">
                       <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Violation Tag</span>
                       <span className="text-sm font-bold text-red-400">{task.system_violation}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">System Confidence</span>
                      <span className="text-xs font-mono text-slate-400">{( (task.system_confidence || 0) * 100 ).toFixed(0)}% CONF</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* main workspace */}
      <div className="flex-1 flex flex-col relative bg-[#020617]">
        {selectedTask ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* top bar context */}
            <div className="bg-slate-900/40 backdrop-blur-md px-10 py-6 border-b border-slate-800/50 flex justify-between items-center">
              <div className="flex items-center space-x-10">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Status</span>
                    {getStatusPill('under_review')}
                 </div>
                 <div className="h-10 w-px bg-slate-800"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Location</span>
                    <span className="text-sm font-semibold text-slate-200">{selectedTask.gps_lat || '28.6139'}, {selectedTask.gps_lng || '77.2090'}</span>
                 </div>
                 <div className="h-10 w-px bg-slate-800"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Temporal Stamp</span>
                    <span className="text-sm font-semibold text-slate-200">{selectedTask.timestamp ? new Date(selectedTask.timestamp).toLocaleTimeString() : 'LIVE_EXTRACT'}</span>
                 </div>
              </div>

              {hasConsensus && (
                <div className="flex items-center space-x-3 bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Match Consensus Detected</span>
                </div>
              )}
            </div>

            {/* content area */}
            <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center space-y-10 custom-scrollbar">

              {/* visual evidence */}
              <div className="w-full max-w-5xl bg-slate-900/30 border border-slate-700/30 rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-2xl">
                <div className="p-2">
                  <div className="relative rounded-[1.8rem] overflow-hidden bg-black flex justify-center items-center aspect-video shadow-inner">
                    {selectedTask.evidence_image_url ? (
                      <img src={selectedTask.evidence_image_url} alt="Evidence" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="text-slate-500 text-xs font-mono uppercase tracking-widest">Awaiting Frame Buffer...</div>
                      </div>
                    )}

                    {/* detection overlay */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="none">
                      <rect x="280" y="140" width="240" height="320" fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="4" rx="12" />
                      <path d="M280 140 L340 140 L340 170 L280 170 Z" fill="#3b82f6" />
                      <text x="286" y="160" fill="white" fontSize="12" fontWeight="bold" fontFamily="monospace">DET_{selectedTask.system_violation}</text>
                    </svg>
                  </div>
                </div>

                <div className="px-10 py-6 bg-slate-900/50 flex justify-between items-center border-t border-slate-800/50">
                  <div className="flex items-center space-x-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-left">Plate Recognition</span>
                      <span className="text-xl font-black text-white tracking-widest font-mono uppercase">{selectedTask.vehicle_number || 'SCAN_PENDING'}</span>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                    </button>
                    <button className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* comparison matrix */}
              <div className="w-full max-w-5xl grid grid-cols-2 gap-8">
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-3xl p-8 transition-all hover:border-slate-700/50">
                   <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-400">Officer Intelligence</h3>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
                         <span className="text-slate-400 text-sm font-medium">Flagged Violation</span>
                         <span className="text-slate-200 font-bold">{selectedTask.officer_violation || 'NONE'}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
                         <span className="text-slate-400 text-sm font-medium">Officer ID</span>
                         <span className="text-slate-200 font-mono text-sm uppercase">COP_4451</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                         <span className="text-slate-400 text-sm font-medium">Field Confidence</span>
                         <span className="text-slate-200 font-bold uppercase text-xs tracking-widest">High</span>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-3xl p-8 transition-all hover:border-slate-700/50 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                   <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">Automated Detection Pipeline</h3>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
                         <span className="text-slate-400 text-sm font-medium">Primary Detection</span>
                         <span className={`font-bold ${hasConsensus ? 'text-emerald-400' : 'text-blue-400'}`}>{selectedTask.system_violation}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-800/50">
                         <span className="text-slate-400 text-sm font-medium">Probability Score</span>
                         <span className="text-slate-200 font-mono text-sm">{( (selectedTask.system_confidence || 0) * 100 ).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                         <span className="text-slate-400 text-sm font-medium">Detection Engine</span>
                         <span className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">YOLOv11-Nano-Quant</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* action controls */}
              <div className="w-full max-w-5xl bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-700/30 space-y-8 mb-10">

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Human Decision Layer</h4>
                    <p className="text-slate-400 text-sm">Select action to finalize legal enforcement record.</p>
                  </div>

                  {selectedTask.system_violation === 'TRIPLE_RIDING' && (
                    <div className="flex items-center space-x-4 bg-slate-800/50 px-6 py-4 rounded-2xl border border-slate-700/50">
                      <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setChildException(!childException)}>
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={childException} readOnly />
                          <div className={`block w-12 h-7 rounded-full transition-colors ${childException ? 'bg-blue-600' : 'bg-slate-700'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${childException ? 'transform translate-x-5' : ''}`}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Child Exception (Under 12)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <button
                    onClick={() => handleDecision('reject')}
                    disabled={mutation.isPending || isProcessingRef.current}
                    className="group relative overflow-hidden bg-slate-800 text-slate-300 font-bold py-6 rounded-2xl border border-slate-700 transition-all hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center space-x-3 relative z-10">
                      <span className="text-xl group-hover:scale-125 transition-transform duration-300">✕</span>
                      <span className="uppercase tracking-[0.2em] text-xs">Reject & Vault (R)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDecision('approve')}
                    disabled={mutation.isPending || isProcessingRef.current}
                    className="group relative overflow-hidden bg-blue-600 text-white font-bold py-6 rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-1 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center space-x-3 relative z-10">
                      <span className="uppercase tracking-[0.2em] text-xs">Approve to VAHAN (A)</span>
                      <span className="text-xl group-hover:translate-x-2 transition-transform duration-300">→</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full"></div>
            <div className="relative z-10 text-center space-y-6 max-w-md">
              <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">System Ready</h2>
                <p className="text-slate-500 font-medium">Select a violation record from the vault to begin the arbitration process.</p>
              </div>
              <div className="pt-4">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-full">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">DTMS Uplink Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  )
}
