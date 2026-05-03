import React, { useEffect, useState, useRef } from 'react';
import { DirectorClient } from '../../lib/director-client';
import { Plan } from '../../../../services/director/src/types/plan.types';
import { Button } from '../ui/button';

export const ChatPanel: React.FC<{ projectId: string; token: string }> = ({ projectId, token }) => {
  const [client, setClient] = useState<DirectorClient | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  
  // A mock session id for demo purposes. In real app, this comes from URL or state.
  const sessionId = 'session_1';

  useEffect(() => {
    const newClient = new DirectorClient(projectId, token);
    newClient.connect();
    setClient(newClient);

    const unsubChat = newClient.on('chat.chunk', (msg) => {
      // Append chunk logic (simplified here)
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { role: 'assistant', content: last.content + msg.text }];
        }
        return [...prev, { role: 'assistant', content: msg.text }];
      });
    });

    const unsubPlanCreated = newClient.on('plan.created', (plan: Plan) => {
      setPendingPlan(plan);
      setMessages(prev => [...prev, { role: 'assistant', content: `I have a plan: ${plan.goal}. Do you approve?` }]);
    });

    const unsubPlanStep = newClient.on('plan.step', (msg) => {
      setActiveStep(msg.description);
    });

    const unsubPlanComplete = newClient.on('plan.complete', () => {
      setActiveStep(null);
      setPendingPlan(null);
      setMessages(prev => [...prev, { role: 'assistant', content: `Plan completed successfully!` }]);
    });

    const unsubError = newClient.on('error', (msg) => {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg.message}` }]);
    });

    return () => {
      unsubChat();
      unsubPlanCreated();
      unsubPlanStep();
      unsubPlanComplete();
      unsubError();
      newClient.disconnect();
    };
  }, [projectId, token]);

  const handleSend = () => {
    if (!input.trim() || !client) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    client.sendChat(sessionId, input);
    setInput('');
  };

  const handleConfirmPlan = () => {
    if (pendingPlan && client) {
      client.confirmPlan(pendingPlan.id);
      setPendingPlan(null);
    }
  };

  const handleRejectPlan = () => {
    if (pendingPlan && client) {
      client.rejectPlan(pendingPlan.id);
      setPendingPlan(null);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Plan rejected. What would you like to do instead?' }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 w-80 text-sm">
      <div className="p-4 border-b border-zinc-800 font-bold">Director AI</div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-blue-600 ml-8' : 'bg-zinc-800 mr-8'}`}>
            {m.content}
          </div>
        ))}

        {pendingPlan && (
          <div className="p-3 border border-yellow-600 bg-yellow-900/20 rounded mr-8 space-y-2">
            <div className="font-semibold text-yellow-500">Plan: {pendingPlan.goal}</div>
            <ul className="list-disc pl-4 text-zinc-300 text-xs">
              {pendingPlan.steps.map(step => (
                <li key={step.id}>{step.description}</li>
              ))}
            </ul>
            <div className="flex space-x-2 pt-2">
              <Button size="sm" onClick={handleConfirmPlan} className="bg-green-600 hover:bg-green-500">Approve</Button>
              <Button size="sm" variant="ghost" onClick={handleRejectPlan}>Reject</Button>
            </div>
          </div>
        )}

        {activeStep && (
          <div className="p-2 border border-blue-500 bg-blue-900/20 rounded mr-8 flex items-center space-x-2 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <div className="text-blue-300">{activeStep}</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <input 
          className="w-full bg-zinc-800 border-none rounded p-2 focus:ring-1 focus:ring-blue-500" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Director to edit..." 
        />
      </div>
    </div>
  );
};
