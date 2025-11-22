import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Building2, Sparkles, CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export default function Clients() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date')
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list()
  });

  const organizeLeadsMutation = useMutation({
    mutationFn: async () => {
      const uniqueCompanies = [...new Set(leads.filter(l => l.company).map(l => l.company))];
      
      const clientPromises = uniqueCompanies.map(async (company) => {
        const existingClient = clients.find(c => c.name === company);
        if (!existingClient) {
          const newClient = await base44.entities.Client.create({
            name: company,
            status: 'prospect',
            checklist: {
              cold_email: false,
              followup: false,
              proposal: false,
              negotiation: false,
              invoice: false,
              delivery: false
            }
          });
          
          // Link leads to this client
          const companyLeads = leads.filter(l => l.company === company);
          await Promise.all(
            companyLeads.map(lead => 
              base44.entities.Lead.update(lead.id, { client_id: newClient.id })
            )
          );
        }
      });
      
      await Promise.all(clientPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['leads']);
      alert('Leads organized successfully!');
    }
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ clientId, checklist }) => 
      base44.entities.Client.update(clientId, { checklist }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
    }
  });

  const calculateProgress = (checklist) => {
    if (!checklist) return 0;
    const items = Object.values(checklist);
    const completed = items.filter(Boolean).length;
    return Math.round((completed / items.length) * 100);
  };

  const checklistSteps = [
    { key: 'cold_email', label: 'Cold Email' },
    { key: 'followup', label: 'Follow-up' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'delivery', label: 'Delivery' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Clients</h1>
          <p className="text-gray-400">Manage client profiles and track sales progress</p>
        </div>
        <Button
          onClick={() => organizeLeadsMutation.mutate()}
          disabled={organizeLeadsMutation.isPending}
          className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Organize Leads
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading clients...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 bg-[#2a2a2a] rounded-xl border border-[#333333]">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No client profiles yet. Click "Organize Leads" to create them automatically!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clients.map(client => {
            const progress = calculateProgress(client.checklist);
            const clientLeads = leads.filter(l => l.client_id === client.id);
            
            return (
              <div key={client.id} className="bg-[#2a2a2a] rounded-xl border border-[#333333] p-6 hover:border-[#00c600] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#00c600] bg-opacity-10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-[#00c600]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{client.name}</h3>
                      <p className="text-gray-400 text-sm">{clientLeads.length} leads</p>
                    </div>
                  </div>
                  <Badge className={`${client.status === 'active' ? 'bg-[#00c600]' : 'bg-gray-500'} text-white border-0`}>
                    {client.status}
                  </Badge>
                </div>

                {client.industry && (
                  <p className="text-gray-400 text-sm mb-4">{client.industry}</p>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Sales Progress</span>
                    <span className="text-[#00c600] text-sm font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-[#333333]" />
                </div>

                <div className="space-y-2">
                  {checklistSteps.map(step => {
                    const isChecked = client.checklist?.[step.key] || false;
                    return (
                      <div key={step.key} className="flex items-center gap-3 p-2 rounded hover:bg-[#333333] transition-colors">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            updateChecklistMutation.mutate({
                              clientId: client.id,
                              checklist: {
                                ...client.checklist,
                                [step.key]: checked
                              }
                            });
                          }}
                          className="border-[#444444] data-[state=checked]:bg-[#00c600] data-[state=checked]:border-[#00c600]"
                        />
                        <span className={`text-sm ${isChecked ? 'text-white' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                        {isChecked && <CheckCircle2 className="w-4 h-4 text-[#00c600] ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries(['clients'])}
      />
    </div>
  );
}