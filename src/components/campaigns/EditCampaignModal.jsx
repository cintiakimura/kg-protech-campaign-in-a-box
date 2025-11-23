import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Send, Upload, Trash2, Save, Rocket, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import CreateLeadModal from '../leads/CreateLeadModal';
import FollowupSequenceEditor from './FollowupSequenceEditor';
import { useQueryClient } from '@tanstack/react-query';

export default function EditCampaignModal({ isOpen, onClose, campaign, onSuccess, onLaunchClick }) {
  const [formData, setFormData] = useState({
    name: '',
    language: 'English',
    target_audience: '',
    email_subject: '',
    email_body: '',
    media_type: '',
    media_url: '',
    followup_sequences: []
  });
  const [videoUrl, setVideoUrl] = useState('');
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        language: campaign.language || 'English',
        target_audience: campaign.target_audience || '',
        email_subject: campaign.email_subject || '',
        email_body: campaign.email_body || '',
        media_type: campaign.media_type || '',
        media_url: campaign.media_url || campaign.generated_image_url || '',
        followup_sequences: campaign.followup_sequences || []
      });
      if (campaign.media_type === 'video_url') {
        setVideoUrl(campaign.media_url || '');
      }
    }
  }, [campaign]);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  if (!isOpen || !campaign) return null;

  const handleGenerateCopy = async () => {
    if (!formData.name || !formData.target_audience) {
      alert('Please fill in campaign name and target audience first');
      return;
    }
    
    setIsGeneratingCopy(true);
    try {
      const prompt = `Create a cold email for KG PROTECH. Product: Automatic Fault Simulator for vehicles via internet, enabling remote diagnostic training with 60% cost savings and reduced setup time.

      Campaign Name: ${formData.name}
      Target Audience: ${formData.target_audience}
      Language: ${formData.language}

      MANDATORY RULES (NEVER SKIP):
      1. EXTREMELY concise (2-3 short paragraphs maximum)
      2. Get straight to the point in first sentence
      3. Ask for a 15-minute webinar (not a sales pitch)
      4. Emphasize: 60% cost savings and reduced setup time
      5. Include this EXACT call-to-action at the end of email body (before signature):
      "📅 Schedule your 15-minute webinar: https://calendar.google.com/calendar/appointments/schedules/AcZssZ0H5P8VL5P_7YDKGZmLJZBQGgKpB5mTl8jC8yz8dXQr0YJZQ0?gv=true"
      6. Professional, direct tone

      End with this exact signature:
      Best regards,
      Cintia Kimura
      Founder and COO
      cintia@kgprotech.com
      Tel: +33 07 68 62 07 04

      Return the result in the following JSON format:
      {
      "subject": "email subject line here",
      "body": "email body content here with proper formatting"
      }`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        email_subject: result.subject,
        email_body: result.body
      }));
    } catch (error) {
      alert('Failed to generate copy. Please try again.');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!formData.name) {
      alert('Please fill in campaign name first');
      return;
    }
    
    setIsGeneratingImage(true);
    try {
      const prompt = `Professional automotive training scene: Modern cars in a professional garage workshop with technicians learning IoT automotive systems. High-tech equipment, diagnostic tools, connected vehicle sensors, and digital training displays. Clean, modern garage environment with good lighting. Photorealistic style.`;
      
      const result = await base44.integrations.Core.GenerateImage({
        prompt: prompt
      });

      setFormData(prev => ({
        ...prev,
        media_type: 'image',
        media_url: result.url
      }));
    } catch (error) {
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleMediaUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsGeneratingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        media_type: type,
        media_url: file_url
      }));
    } catch (error) {
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDeleteMedia = () => {
    setFormData(prev => ({
      ...prev,
      media_type: '',
      media_url: ''
    }));
    setVideoUrl('');
  };

  const handleAddVideoUrl = () => {
    if (!videoUrl.trim()) {
      alert('Please enter a video URL');
      return;
    }
    setFormData(prev => ({
      ...prev,
      media_type: 'video_url',
      media_url: videoUrl
    }));
  };

  const handleSubmit = async () => {
    try {
      await base44.entities.Campaign.update(campaign.id, formData);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to update campaign');
    }
  };

  const handleLaunch = async () => {
    await handleSubmit();
    onLaunchClick({ ...campaign, ...formData });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2a2a2a] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-custom">
        <div className="sticky top-0 bg-[#2a2a2a] border-b border-[#333333] p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <Label className="text-gray-300 mb-2">Campaign Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Q1 2025 IoT Training Launch"
              className="bg-[#333333] border-[#444444] text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300 mb-2">Language</Label>
              <Select value={formData.language} onValueChange={(val) => setFormData(prev => ({ ...prev, language: val }))}>
                <SelectTrigger className="bg-[#333333] border-[#444444] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Portuguese">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 mb-2">Target Audience</Label>
              <Input
                value={formData.target_audience}
                onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                placeholder="Automotive engineers, fleet managers"
                className="bg-[#333333] border-[#444444] text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleGenerateCopy}
              disabled={isGeneratingCopy}
              className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
            >
              {isGeneratingCopy ? (
                <>Generating Copy...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate Copy
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="bg-[#333333] hover:bg-[#444444] text-white"
            >
              {isGeneratingImage ? (
                <>Generating...</>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
            <label htmlFor="edit-image-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleMediaUpload(e, 'image')}
                className="hidden"
                id="edit-image-upload"
                disabled={isGeneratingImage}
              />
              <Button
                type="button"
                disabled={isGeneratingImage}
                className="bg-[#333333] hover:bg-[#444444] text-white cursor-pointer"
                onClick={() => document.getElementById('edit-image-upload').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            </label>
            <label htmlFor="edit-presentation-upload">
              <input
                type="file"
                accept=".pdf,.ppt,.pptx"
                onChange={(e) => handleMediaUpload(e, 'presentation')}
                className="hidden"
                id="edit-presentation-upload"
                disabled={isGeneratingImage}
              />
              <Button
                type="button"
                disabled={isGeneratingImage}
                className="bg-[#333333] hover:bg-[#444444] text-white cursor-pointer"
                onClick={() => document.getElementById('edit-presentation-upload').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Presentation
              </Button>
            </label>
          </div>

          <div>
            <Label className="text-gray-300 mb-2">Email Subject</Label>
            <Input
              value={formData.email_subject}
              onChange={(e) => setFormData(prev => ({ ...prev, email_subject: e.target.value }))}
              placeholder="Subject line"
              className="bg-[#333333] border-[#444444] text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300 mb-2">Email Body</Label>
            <Textarea
              value={formData.email_body}
              onChange={(e) => setFormData(prev => ({ ...prev, email_body: e.target.value }))}
              placeholder="Email content"
              rows={8}
              className="bg-[#333333] border-[#444444] text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300 mb-2">Video URL (YouTube, Vimeo, etc.)</Label>
            <div className="flex gap-2">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-[#333333] border-[#444444] text-white"
              />
              <Button
                onClick={handleAddVideoUrl}
                className="bg-[#333333] hover:bg-[#444444] text-white"
              >
                Add
              </Button>
            </div>
          </div>

          {formData.media_url && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-300">
                  Campaign {formData.media_type === 'image' ? 'Image' : 
                           formData.media_type === 'presentation' ? 'Presentation' : 'Video'}
                </Label>
                <Button
                  onClick={handleDeleteMedia}
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
              {formData.media_type === 'image' && (
                <img 
                  src={formData.media_url} 
                  alt="Campaign" 
                  className="w-full rounded-lg border-2 border-[#00c600]"
                />
              )}
              {formData.media_type === 'presentation' && (
                <div className="p-4 bg-[#333333] rounded-lg border-2 border-[#00c600] text-center">
                  <p className="text-white">📄 Presentation attached</p>
                  <a href={formData.media_url} target="_blank" rel="noopener noreferrer" className="text-[#00c600] text-sm">
                    View file
                  </a>
                </div>
              )}
              {formData.media_type === 'video_url' && (
                <div className="p-4 bg-[#333333] rounded-lg border-2 border-[#00c600]">
                  <p className="text-white mb-2">🎥 Video URL:</p>
                  <a href={formData.media_url} target="_blank" rel="noopener noreferrer" className="text-[#00c600] text-sm break-all">
                    {formData.media_url}
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-[#333333] pt-6">
            <FollowupSequenceEditor
              sequences={formData.followup_sequences}
              onChange={(sequences) => setFormData(prev => ({ ...prev, followup_sequences: sequences }))}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#333333]">
            <Button
              onClick={() => setIsCreateLeadModalOpen(true)}
              className="bg-[#333333] hover:bg-[#444444] text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
              disabled={!formData.name}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            {(campaign?.status === 'draft' || campaign?.status === 'active') && (
              <Button
                onClick={handleLaunch}
                className="flex-1 bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
                disabled={!formData.name}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Select Recipients & Launch
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="border-[#444444] text-gray-300 hover:bg-[#333333]"
            >
              Cancel
            </Button>
            </div>
            </div>
            </div>

            <CreateLeadModal
            isOpen={isCreateLeadModalOpen}
            onClose={() => setIsCreateLeadModalOpen(false)}
            onSuccess={() => {
            queryClient.invalidateQueries(['leads']);
            setIsCreateLeadModalOpen(false);
            }}
            />
            </div>
            );
            }