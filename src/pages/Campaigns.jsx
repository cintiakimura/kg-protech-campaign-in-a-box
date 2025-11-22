import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Rocket, Image as ImageIcon, Edit } from 'lucide-react';
import CreateCampaignModal from '../components/campaigns/CreateCampaignModal';
import EditCampaignModal from '../components/campaigns/EditCampaignModal';
import SelectRecipientsModal from '../components/campaigns/SelectRecipientsModal';
import { Badge } from '@/components/ui/badge';

export default function Campaigns() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSelectRecipientsOpen, setIsSelectRecipientsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date')
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list()
  });

  const launchCampaignMutation = useMutation({
    mutationFn: async ({ campaign, selectedLeads }) => {
      const scheduleLink = `${window.location.origin}/ScheduleWebinar`;
      
      // Send actual emails via integration to all recipients
      const sendPromises = selectedLeads.map(async (recipient) => {
        try {
          // Create email record in database
          await base44.entities.EmailMessage.create({
            subject: campaign.email_subject,
            body: `${campaign.email_body}\n\n📅 Schedule your 15-minute webinar here: ${scheduleLink}`,
            from_email: 'campaigns@kgprotech.com',
            to_email: recipient.email,
            folder: 'sent',
            is_read: true,
            date: new Date().toISOString()
          });

          // Send actual email
          await base44.integrations.Core.SendEmail({
            to: recipient.email,
            subject: campaign.email_subject,
            body: `${campaign.email_body}\n\n📅 Schedule your 15-minute webinar here: ${scheduleLink}`
          });
        } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
        }
      });
      
      await Promise.all(sendPromises);
      
      // Update campaign
      return base44.entities.Campaign.update(campaign.id, {
        status: 'active',
        sent_count: (campaign.sent_count || 0) + selectedLeads.length
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['campaigns']);
      queryClient.invalidateQueries(['emails']);
      setIsSelectRecipientsOpen(false);
      
      // Show success popup
      const successMessage = document.createElement('div');
      successMessage.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: #2a2a2a; border: 2px solid #00c600; border-radius: 12px; 
                    padding: 32px; z-index: 9999; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    text-align: center; min-width: 400px;">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <h2 style="color: white; font-size: 24px; font-weight: bold; margin-bottom: 12px;">
            Campaign Sent Successfully!
          </h2>
          <p style="color: #00c600; font-size: 18px; margin-bottom: 8px;">
            ${variables.selectedLeads.length} emails sent
          </p>
          <p style="color: #888; font-size: 14px;">
            Campaign "${variables.campaign.name}" has been launched
          </p>
        </div>
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9998;"></div>
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        document.body.removeChild(successMessage);
        setSelectedCampaign(null);
      }, 3000);
    },
    onError: (error) => {
      console.error('Campaign launch failed:', error);
      
      // Show error popup
      const errorMessage = document.createElement('div');
      errorMessage.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: #2a2a2a; border: 2px solid #ff4444; border-radius: 12px; 
                    padding: 32px; z-index: 9999; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    text-align: center; min-width: 400px;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <h2 style="color: white; font-size: 24px; font-weight: bold; margin-bottom: 12px;">
            Campaign Failed to Send
          </h2>
          <p style="color: #ff4444; font-size: 16px;">
            Please try again or contact support
          </p>
        </div>
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9998;" 
             onclick="this.parentElement.remove()"></div>
      `;
      document.body.appendChild(errorMessage);
      
      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage);
        }
      }, 4000);
    }
  });

  const handleLaunchClick = (campaign) => {
    setSelectedCampaign(campaign);
    setIsSelectRecipientsOpen(true);
  };

  const handleConfirmLaunch = (selectedLeads) => {
    launchCampaignMutation.mutate({ campaign: selectedCampaign, selectedLeads });
  };

  const handleEditClick = (campaign) => {
    setSelectedCampaign(campaign);
    setIsEditModalOpen(true);
  };

  const handleLaunchFromEdit = (campaign) => {
    setSelectedCampaign(campaign);
    setIsEditModalOpen(false);
    setIsSelectRecipientsOpen(true);
  };

  const statusColors = {
    draft: 'bg-gray-500',
    active: 'bg-[#00c600]',
    completed: 'bg-blue-500',
    paused: 'bg-yellow-500'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-gray-400">Create and manage marketing campaigns</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 bg-[#2a2a2a] rounded-xl border border-[#333333]">
          <Rocket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No campaigns yet. Create your first campaign to get started!</p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-[#2a2a2a] rounded-xl border border-[#333333] overflow-hidden hover:border-[#00c600] transition-all">
              {campaign.media_url || campaign.generated_image_url ? (
                <>
                  {(campaign.media_type === 'image' || campaign.generated_image_url) && (
                    <img 
                      src={campaign.media_url || campaign.generated_image_url} 
                      alt={campaign.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  {campaign.media_type === 'presentation' && (
                    <div className="w-full h-48 bg-[#333333] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-2">📄</div>
                        <p className="text-gray-400 text-sm">Presentation attached</p>
                      </div>
                    </div>
                  )}
                  {campaign.media_type === 'video_url' && (
                    <div className="w-full h-48 bg-[#333333] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-2">🎥</div>
                        <p className="text-gray-400 text-sm">Video URL attached</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-48 bg-[#333333] flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-600" />
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditClick(campaign)}
                      className="text-[#00c600] hover:text-[#00dd00] hover:bg-[#00c600]/10 h-8 px-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Badge className={`${statusColors[campaign.status]} text-white border-0`}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-gray-400 text-sm">
                    <span className="text-gray-500">Language:</span> {campaign.language}
                  </p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-gray-500">Target:</span> {campaign.target_audience || 'Not specified'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-gray-500">Sent:</span> {campaign.sent_count || 0} emails
                  </p>
                </div>

                {campaign.email_subject && (
                  <div className="mb-4 p-3 bg-[#333333] rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Subject:</p>
                    <p className="text-white text-sm">{campaign.email_subject}</p>
                  </div>
                )}

                {(campaign.status === 'draft' || campaign.status === 'active') && (
                  <Button
                    onClick={() => handleLaunchClick(campaign)}
                    disabled={leads.length === 0}
                    className="w-full bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    {leads.length === 0 ? 'No Leads Available' : campaign.status === 'draft' ? 'Select Recipients & Launch' : 'Send to More Recipients'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries(['campaigns'])}
      />

      <EditCampaignModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCampaign(null);
        }}
        campaign={selectedCampaign}
        onSuccess={() => queryClient.invalidateQueries(['campaigns'])}
        onLaunchClick={handleLaunchFromEdit}
      />

      <SelectRecipientsModal
        isOpen={isSelectRecipientsOpen}
        onClose={() => {
          setIsSelectRecipientsOpen(false);
          setSelectedCampaign(null);
        }}
        leads={leads}
        onConfirm={handleConfirmLaunch}
        isLaunching={launchCampaignMutation.isPending}
        onLeadCreated={() => queryClient.invalidateQueries(['leads'])}
      />
    </div>
  );
}