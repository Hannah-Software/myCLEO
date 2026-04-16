import { useState, useEffect } from 'react';

export interface LinearTask {
  id: string;
  title: string;
  priority: number;
  status: string;
  team: { name: string };
}

export function useLinearTasks(teamId: string = 'IVA') {
  const [tasks, setTasks] = useState<LinearTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 300000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [teamId]);

  const fetchTasks = async () => {
    try {
      // TODO: Fetch from Linear API with API key from Doppler
      // For now, mock data. Replace with actual API call:
      // const response = await fetch('https://api.linear.app/graphql', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': LINEAR_API_KEY,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     query: `{ issues(filter: { team: { id: { eq: "${teamId}" } } }) { nodes { id title priority } } }`,
      //   }),
      // });

      // Mock data for now
      const mockTasks = [
        { id: 'IVA-655', title: 'Check-in screen — A/B/C/D/E phase buttons', priority: 2, status: 'in-progress', team: { name: 'IVA' } },
        { id: 'IVA-656', title: 'Linear task queue — top 5 today', priority: 2, status: 'in-progress', team: { name: 'IVA' } },
        { id: 'IVA-657', title: 'Health log — mood, energy, meds', priority: 2, status: 'pending', team: { name: 'IVA' } },
        { id: 'IVA-658', title: 'Google Calendar — unified view', priority: 2, status: 'pending', team: { name: 'IVA' } },
        { id: 'IVA-659', title: 'Gmail — action items', priority: 2, status: 'pending', team: { name: 'IVA' } },
      ];

      setTasks(mockTasks.slice(0, 5)); // Top 5
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  return { tasks, loading, error };
}
