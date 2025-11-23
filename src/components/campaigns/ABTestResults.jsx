import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function calculateZScore(p1, n1, p2, n2) {
  if (n1 === 0 || n2 === 0) return 0;
  
  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
  
  if (se === 0) return 0;
  return (p1 - p2) / se;
}

function getConfidenceLevel(zScore) {
  const absZ = Math.abs(zScore);
  if (absZ >= 2.576) return { level: 99, significant: true };
  if (absZ >= 1.96) return { level: 95, significant: true };
  if (absZ >= 1.645) return { level: 90, significant: true };
  return { level: Math.round((1 - 2 * (1 - 0.5 * (1 + Math.erf(absZ / Math.sqrt(2))))) * 100), significant: false };
}

function calculateLift(baseline, variant) {
  if (baseline === 0) return 0;
  return ((variant - baseline) / baseline) * 100;
}

export default function ABTestResults({ campaign, onDeclareWinner }) {
  if (!campaign.ab_test_enabled || !campaign.ab_test_variants || campaign.ab_test_variants.length < 2) {
    return (
      <div className="bg-[#2a2a2a] rounded-xl border border-[#333333] p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No A/B test configured for this campaign</p>
      </div>
    );
  }

  const variants = campaign.ab_test_variants;
  const totalSent = variants.reduce((sum, v) => sum + v.sent_count, 0);

  if (totalSent < 30) {
    return (
      <div className="bg-[#2a2a2a] rounded-xl border border-[#333333] p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Collecting data... Need at least 30 sends for statistical analysis</p>
        <p className="text-sm text-gray-500 mt-2">Current: {totalSent} sends</p>
      </div>
    );
  }

  // Find control (first variant or one with most traffic)
  const control = variants[0];
  const controlOpenRate = control.sent_count > 0 ? control.opens / control.sent_count : 0;
  const controlClickRate = control.sent_count > 0 ? control.clicks / control.sent_count : 0;

  // Analyze each variant against control
  const analysis = variants.map((variant, idx) => {
    if (idx === 0) return { variant, isControl: true, openSignificance: null, clickSignificance: null };

    const variantOpenRate = variant.sent_count > 0 ? variant.opens / variant.sent_count : 0;
    const variantClickRate = variant.sent_count > 0 ? variant.clicks / variant.sent_count : 0;

    const openZScore = calculateZScore(variantOpenRate, variant.sent_count, controlOpenRate, control.sent_count);
    const clickZScore = calculateZScore(variantClickRate, variant.sent_count, controlClickRate, control.sent_count);

    const openConfidence = getConfidenceLevel(openZScore);
    const clickConfidence = getConfidenceLevel(clickZScore);

    const openLift = calculateLift(controlOpenRate * 100, variantOpenRate * 100);
    const clickLift = calculateLift(controlClickRate * 100, variantClickRate * 100);

    return {
      variant,
      isControl: false,
      openSignificance: {
        confidence: openConfidence,
        lift: openLift,
        isWinning: variantOpenRate > controlOpenRate && openConfidence.significant
      },
      clickSignificance: {
        confidence: clickConfidence,
        lift: clickLift,
        isWinning: variantClickRate > controlClickRate && clickConfidence.significant
      }
    };
  });

  // Find overall winner
  const winner = analysis.reduce((best, current) => {
    if (current.isControl) return best;
    
    const currentScore = 
      (current.openSignificance?.isWinning ? current.openSignificance.confidence.level : 0) +
      (current.clickSignificance?.isWinning ? current.clickSignificance.confidence.level : 0);
    
    const bestScore = best ? 
      (best.openSignificance?.isWinning ? best.openSignificance.confidence.level : 0) +
      (best.clickSignificance?.isWinning ? best.clickSignificance.confidence.level : 0) : 0;
    
    return currentScore > bestScore ? current : best;
  }, null);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#2a2a2a] border-[#333333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Total Sends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{totalSent}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#2a2a2a] border-[#333333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Variants Tested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{variants.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#2a2a2a] border-[#333333]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Winner Status</CardTitle>
          </CardHeader>
          <CardContent>
            {winner?.openSignificance?.isWinning || winner?.clickSignificance?.isWinning ? (
              <Badge className="bg-green-600 text-white border-0 text-lg px-3 py-1">
                <Award className="w-4 h-4 mr-2" />
                Clear Winner
              </Badge>
            ) : (
              <Badge className="bg-yellow-600 text-white border-0 text-lg px-3 py-1">
                Inconclusive
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Variant Analysis */}
      <div className="space-y-4">
        {analysis.map((item, idx) => (
          <Card key={item.variant.variant_id} className={`bg-[#2a2a2a] border-2 ${
            winner?.variant.variant_id === item.variant.variant_id ? 'border-[#00c600]' : 'border-[#333333]'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-white">{item.variant.name}</CardTitle>
                  {item.isControl && (
                    <Badge className="bg-blue-600 text-white border-0">Control</Badge>
                  )}
                  {winner?.variant.variant_id === item.variant.variant_id && (
                    <Badge className="bg-[#00c600] text-white border-0">
                      <Award className="w-3 h-3 mr-1" />
                      Winner
                    </Badge>
                  )}
                </div>
                <Badge className="bg-[#333333] text-white border-0">
                  {item.variant.sent_count} sends ({item.variant.traffic_percentage}%)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#333333] rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Open Rate</p>
                  <p className="text-2xl font-bold text-white">{item.variant.open_rate}%</p>
                  {!item.isControl && item.openSignificance && (
                    <div className="mt-2">
                      <Badge className={`text-xs ${
                        item.openSignificance.isWinning ? 'bg-green-600' : 
                        item.openSignificance.lift < 0 ? 'bg-red-600' : 'bg-gray-600'
                      } text-white border-0`}>
                        {item.openSignificance.lift > 0 ? '+' : ''}{item.openSignificance.lift.toFixed(1)}% lift
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.openSignificance.confidence.level}% confidence
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[#333333] rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Click Rate</p>
                  <p className="text-2xl font-bold text-white">{item.variant.click_rate}%</p>
                  {!item.isControl && item.clickSignificance && (
                    <div className="mt-2">
                      <Badge className={`text-xs ${
                        item.clickSignificance.isWinning ? 'bg-green-600' : 
                        item.clickSignificance.lift < 0 ? 'bg-red-600' : 'bg-gray-600'
                      } text-white border-0`}>
                        {item.clickSignificance.lift > 0 ? '+' : ''}{item.clickSignificance.lift.toFixed(1)}% lift
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.clickSignificance.confidence.level}% confidence
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[#333333] rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">{item.variant.conversion_rate}%</p>
                </div>
              </div>

              {/* Subject and Preview */}
              <div className="bg-[#333333] rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Subject Line</p>
                <p className="text-sm text-white font-medium">{item.variant.email_subject}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Winner Action */}
      {winner && (winner.openSignificance?.isWinning || winner.clickSignificance?.isWinning) && (
        <Card className="bg-gradient-to-r from-green-900/20 to-green-800/20 border-2 border-green-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  <Award className="w-5 h-5 inline mr-2 text-green-500" />
                  Statistical Winner Detected!
                </h3>
                <p className="text-gray-300">
                  {winner.variant.name} shows statistically significant improvements. 
                  Use this variant for future campaigns.
                </p>
              </div>
              <Button
                onClick={() => onDeclareWinner?.(winner.variant)}
                className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121] font-medium"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Use as Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}