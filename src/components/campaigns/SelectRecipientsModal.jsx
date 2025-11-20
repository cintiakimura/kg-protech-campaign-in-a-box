import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export default function SelectRecipientsModal({ isOpen, onClose, leads, onConfirm, isLaunching }) {
  const [selectedLeads, setSelectedLeads] = useState([]);

  if (!isOpen) return null;

  const toggleLead = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const handleConfirm = () => {
    const selected = leads.filter(l => selectedLeads.includes(l.id));
    onConfirm(selected);
  };

  // Group leads by company
  const leadsByCompany = leads.reduce((acc, lead) => {
    const company = lead.company || 'No Company';
    if (!acc[company]) acc[company] = [];
    acc[company].push(lead);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2a2a2a] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-[#333333] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Select Recipients</h2>
            <p className="text-gray-400 text-sm mt-1">
              {selectedLeads.length} of {leads.length} leads selected
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-custom p-6">
          <div className="mb-4">
            <Button
              onClick={toggleAll}
              variant="outline"
              className="border-[#444444] text-gray-300 hover:bg-[#333333]"
            >
              {selectedLeads.length === leads.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="space-y-4">
            {Object.entries(leadsByCompany).map(([company, companyLeads]) => (
              <div key={company} className="bg-[#333333] rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  {company}
                  <Badge className="bg-[#444444] text-gray-300 border-0">
                    {companyLeads.length} leads
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {companyLeads.map(lead => (
                    <div 
                      key={lead.id}
                      className="flex items-center gap-3 p-3 rounded hover:bg-[#444444] transition-colors cursor-pointer"
                      onClick={() => toggleLead(lead.id)}
                    >
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                        className="border-[#555555] data-[state=checked]:bg-[#00c600] data-[state=checked]:border-[#00c600]"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{lead.full_name}</p>
                        <p className="text-gray-400 text-sm">{lead.email}</p>
                      </div>
                      <Badge className={`${
                        lead.status === 'new' ? 'bg-blue-500' :
                        lead.status === 'contacted' ? 'bg-yellow-500' :
                        lead.status === 'interested' ? 'bg-purple-500' :
                        lead.status === 'scheduled' ? 'bg-orange-500' :
                        'bg-[#00c600]'
                      } text-white border-0`}>
                        {lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#333333] p-6 flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={selectedLeads.length === 0 || isLaunching}
            className="flex-1 bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLaunching ? 'Launching...' : `Launch to ${selectedLeads.length} Recipients`}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-[#444444] text-gray-300 hover:bg-[#333333]"
            disabled={isLaunching}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}