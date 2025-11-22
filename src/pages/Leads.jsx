import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Search, Mail, Calendar as CalendarIcon, Edit } from 'lucide-react';
import ImportLeadsModal from '../components/leads/ImportLeadsModal';
import CreateLeadModal from '../components/leads/CreateLeadModal';
import EditLeadModal from '../components/leads/EditLeadModal';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Leads() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date')
  });

  const filteredLeads = leads.filter(lead => 
    lead.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors = {
    new: 'bg-blue-500',
    contacted: 'bg-yellow-500',
    interested: 'bg-purple-500',
    scheduled: 'bg-orange-500',
    closed: 'bg-[#00c600]'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Leads</h1>
          <p className="text-gray-400">Manage and track your leads</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Lead
          </Button>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#333333] hover:bg-[#444444] text-white"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import Leads
          </Button>
        </div>
      </div>

      <div className="bg-[#2a2a2a] rounded-xl border border-[#333333] p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, email, or company..."
            className="pl-10 bg-[#333333] border-[#444444] text-white"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              {searchQuery ? 'No leads found matching your search' : 'No leads yet. Import leads to get started!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#333333] hover:bg-transparent">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Company</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Language</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => (
                  <TableRow key={lead.id} className="border-[#333333] hover:bg-[#333333]">
                    <TableCell className="text-white font-medium">{lead.full_name}</TableCell>
                    <TableCell className="text-gray-300">{lead.email}</TableCell>
                    <TableCell className="text-gray-300">{lead.company || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[lead.status]} text-white border-0`}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">{lead.language_preference || 'English'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsEditModalOpen(true);
                          }}
                          className="text-[#00c600] hover:text-[#00dd00] hover:bg-[#00c600]/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#00c600] hover:text-[#00dd00] hover:bg-[#00c600]/10"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#00c600] hover:text-[#00dd00] hover:bg-[#00c600]/10"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries(['leads'])}
      />

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries(['leads'])}
      />

      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onSuccess={() => queryClient.invalidateQueries(['leads'])}
      />
    </div>
  );
}