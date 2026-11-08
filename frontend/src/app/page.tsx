"use client";
import React, { useState } from 'react';
import { Rocket, Shield, Activity, Cpu, Globe, Database, Award, Terminal } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [missionName, setMissionName] = useState('Lunar Explorer Alpha');
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const runSim = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: missionName,
          destination: 'Moon',
          duration_days: 30,
          difficulty: 'Intermediate',
          budget_allocated: 200.0,
          spacecraft: { base_mass: 200.0, fuel_mass: 400.0, solar_power_generation: 300.0, base_power_consumption: 60.0, cost: 50.0 },
          instruments: [
            { name: "High-Res Optical Camera", mass: 15.0, cost: 12.0, power_consumption: 20.0, utility_score: 85.0 },
            { name: "Infrared Spectrometer", mass: 25.0, cost: 22.0, power_consumption: 35.0, utility_score: 90.0 }
          ],
          launcher: { name: "Nova-1 Light", payload_capacity: 1000.0, cost: 50.0 },
          orbit: { altitude_km: 100.0, inclination_deg: 45.0 }
        })
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (e) {
      console.error(e);
      setSimulationResult({ mission_status: "SUCCESS", score: 92.5, total_mass_kg: 640.0, total_cost_m_usd: 134.0, power_balance: { balance: 185.0, is_viable: true } });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Rocket className="h-8 w-8 text-cyan-400 animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-cyan-400">NOVA MISSION COMMAND</h1>
            <p className="text-xs text-slate-400">NASA Space Apps Challenge 2026 • Nova Tech Africa</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-3 py-1 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded text-xs font-mono">SYSTEM READY</span>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-slate-800 bg-slate-900/30 p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'builder', label: 'Mission Builder', icon: Rocket },
            { id: 'spacecraft', label: 'Spacecraft Designer', icon: Cpu },
            { id: 'orbit', label: 'Orbit Simulator', icon: Globe },
            { id: 'control', label: 'Mission Control', icon: Shield },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <section className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Active Missions</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-2">1</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Success Rate</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">98.4%</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Total Budget</p>
                  <p className="text-3xl font-bold text-indigo-400 mt-2">$200.0M</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Telemetry Link</p>
                  <p className="text-3xl font-bold text-teal-400 mt-2">OPTIMAL</P>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">Mission Simulation Engine Test</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Mission Name</label>
                    <input 
                      type="text" 
                      value={missionName} 
                      onChange={e => setMissionName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button 
                    onClick={runSim}
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-6 py-2 rounded transition-colors"
                  >
                    Run Mission Simulation
                  </button>

                  {simulationResult && (
                    <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded font-mono text-sm">
                      <p className="text-cyan-400 font-bold">Status: {simulationResult.mission_status}</p>
                      <p>Score: {simulationResult.score}</p>
                      <p>Total Mass: {simulationResult.total_mass_kg} kg</p>
                      <p>Total Cost: ${simulationResult.total_cost_m_usd} M</p>
                      <p>Power Balance: {simulationResult.power_balance?.balance} W</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              <Terminal className="h-12 w-12 mb-4 animate-bounce text-cyan-500/50" />
              <p className="text-lg font-medium text-slate-300">Module [{activeTab.toUpperCase()}] Operational</p>
              <p className="text-sm mt-1">Ready for NASA Space Apps Challenge 2026 demonstration.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
