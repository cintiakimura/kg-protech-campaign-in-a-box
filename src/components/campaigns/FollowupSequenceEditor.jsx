import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Clock, Mail } from 'lucide-react';

export default function FollowupSequenceEditor({ sequences = [], onChange }) {
  const [editingSequences, setEditingSequences] = useState(sequences);

  const addSequence = () => {
    const newSequence = {
      trigger_status: 'contacted',
      delay_days: 2,
      email_subject: '',
      email_body: ''
    };
    const updated = [...editingSequences, newSequence];
    setEditingSequences(updated);
    onChange(updated);
  };

  const updateSequence = (index, field, value) => {
    const updated = [...editingSequences];
    updated[index] = { ...updated[index], [field]: value };
    setEditingSequences(updated);
    onChange(updated);
  };

  const removeSequence = (index) => {
    const updated = editingSequences.filter((_, i) => i !== index);
    setEditingSequences(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Follow-up Sequences</Label>
        <Button
          type="button"
          onClick={addSequence}
          size="sm"
          className="bg-[#333333] hover:bg-[#444444] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sequence
        </Button>
      </div>

      {editingSequences.length === 0 ? (
        <div className="p-4 bg-[#333333] rounded-lg border border-[#444444] text-center">
          <Mail className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No follow-up sequences defined</p>
          <p className="text-gray-500 text-xs mt-1">Click "Add Sequence" to create automated follow-ups</p>
        </div>
      ) : (
        <div className="space-y-4">
          {editingSequences.map((sequence, index) => (
            <div key={index} className="p-4 bg-[#333333] rounded-lg border border-[#444444] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00c600]" />
                  <span className="text-white font-medium text-sm">Sequence {index + 1}</span>
                </div>
                <Button
                  type="button"
                  onClick={() => removeSequence(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs mb-1">Trigger on Status</Label>
                  <Select 
                    value={sequence.trigger_status} 
                    onValueChange={(val) => updateSequence(index, 'trigger_status', val)}
                  >
                    <SelectTrigger className="bg-[#2a2a2a] border-[#444444] text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-400 text-xs mb-1">Delay (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={sequence.delay_days}
                    onChange={(e) => updateSequence(index, 'delay_days', parseInt(e.target.value))}
                    className="bg-[#2a2a2a] border-[#444444] text-white h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-xs mb-1">Email Subject</Label>
                <Input
                  value={sequence.email_subject}
                  onChange={(e) => updateSequence(index, 'email_subject', e.target.value)}
                  placeholder="Follow-up subject..."
                  className="bg-[#2a2a2a] border-[#444444] text-white"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-xs mb-1">Email Body</Label>
                <Textarea
                  value={sequence.email_body}
                  onChange={(e) => updateSequence(index, 'email_body', e.target.value)}
                  placeholder="Follow-up email content..."
                  rows={4}
                  className="bg-[#2a2a2a] border-[#444444] text-white"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-400 text-xs">
          💡 Follow-ups are triggered manually. Go to the Leads page and click "Send Pending Follow-ups" to send emails that are due.
        </p>
      </div>
    </div>
  );
}