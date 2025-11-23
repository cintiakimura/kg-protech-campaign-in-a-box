import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BarChart3, TrendingUp } from 'lucide-react';
import ABTestResults from '../components/campaigns/ABTestResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ABTestDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date')
  });

  const abTestCampaigns = campaigns.filter(c => c.ab_test_enabled && c.ab_test_variants?.length > 0);

  const filteredCampaigns = abTestCampaigns.filter(campaign =>
    campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.target_audience?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeclareWinner = async (campaign, winningVariant) => {
    try {
      // Create a new campaign template from the winning variant
      await base44.entities.Campaign.create({
        name: `${campaign.name} - Winner Template`,
        status: 'draft',
        language: campaign.language,
        target_audience: campaign.target_audience,
        email_subject: winningVariant.email_subject,
        email_body: winningVariant.email_body,
        media_type: campaign.media_type,
        media_url: campaign.media_url,
        ab_test_enabled: false
      });

      alert('Winning variant saved as a new campaign template!');
      setSelectedCampaign(null);
    } catch (error) {
      alert('Failed to save winning variant');
    }
  };

  // Calculate aggregate stats
  const totalTests = abTestCampaigns.length;
  const activeTests = abTestCampaigns.filter(c => c.status === 'active').length;
  const totalSends = abTestCampaigns.reduce((sum, c) => 
    c.ab_test_variants?.reduce((vSum, v) => vSum + (v.sent_count || 0), 0) || 0, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">A/B Test Dashboard</h1>
          <p className="text-gray-400">Analyze and optimize campaign performance</p>
        </div>
        <Button
          onClick={() => window.location.href = '/Campaigns'}
          className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          Back to Campaigns
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#2a2a2a] border-[#333333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Total A/B Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{totalTests}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#2a2a2a] border-[#333333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Active Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#00c600]">{activeTests}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#2a2a2a] border-[#333333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Total Test Sends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{totalSends}</p>
          </CardContent>
        </Card>
      </div>

      {selectedCampaign ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedCampaign.name}</h2>
              <p className="text-gray-400">{selectedCampaign.target_audience}</p>
            </div>
            <Button
              onClick={() => setSelectedCampaign(null)}
              variant="outline"
              className="border-[#444444] text-gray-300 hover:bg-[#333333]"
            >
              Back to List
            </Button>
          </div>

          <ABTestResults
            campaign={selectedCampaign}
            onDeclareWinner={(variant) => handleDeclareWinner(selectedCampaign, variant)}
          />
        </div>
      ) : (
        <>
          <div className="bg-[#2a2a2a] rounded-xl border border-[#333333] p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search A/B tests by campaign name or audience..."
                className="pl-10 bg-[#333333] border-[#444444] text-white"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading A/B tests...</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">
                  {searchQuery ? 'No A/B tests found matching your search' : 'No A/B tests configured yet'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => window.location.href = '/Campaigns'}
                    className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121]"
                  >
                    Create Your First A/B Test
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredCampaigns.map(campaign => {
                  const variants = campaign.ab_test_variants || [];
                  const totalSent = variants.reduce((sum, v) => sum + (v.sent_count || 0), 0);
                  const avgOpenRate = variants.length > 0 
                    ? variants.reduce((sum, v) => sum + (v.open_rate || 0), 0) / variants.length 
                    : 0;
                  const avgClickRate = variants.length > 0 
                    ? variants.reduce((sum, v) => sum + (v.click_rate || 0), 0) / variants.length 
                    : 0;

                  return (
                    <Card 
                      key={campaign.id}
                      className="bg-[#2a2a2a] border-[#333333] hover:border-[#00c600] transition-all cursor-pointer"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <CardHeader>
                        <CardTitle className="text-white">{campaign.name}</CardTitle>
                        <p className="text-sm text-gray-400">{campaign.target_audience}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[#333333] rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Variants</p>
                            <p className="text-xl font-bold text-white">{variants.length}</p>
                          </div>
                          <div className="bg-[#333333] rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Sends</p>
                            <p className="text-xl font-bold text-white">{totalSent}</p>
                          </div>
                          <div className="bg-[#333333] rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">Status</p>
                            <p className={`text-sm font-bold ${
                              campaign.status === 'active' ? 'text-[#00c600]' : 'text-gray-400'
                            }`}>
                              {campaign.status}
                            </p>
                          </div>
                        </div>

                        {totalSent > 0 && (
                          <div className="flex items-center justify-between pt-3 border-t border-[#333333]">
                            <div>
                              <p className="text-xs text-gray-400">Avg Open Rate</p>
                              <p className="text-lg font-bold text-[#00c600]">{avgOpenRate.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Avg Click Rate</p>
                              <p className="text-lg font-bold text-blue-500">{avgClickRate.toFixed(1)}%</p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121]"
                            >
                              <TrendingUp className="w-4 h-4 mr-2" />
                              View Results
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}