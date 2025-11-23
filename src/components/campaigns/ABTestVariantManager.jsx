import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Sparkles, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ABTestVariantManager({ variants = [], onChange, language, targetAudience }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const addVariant = () => {
    const variantId = `variant_${Date.now()}`;
    const newVariant = {
      variant_id: variantId,
      name: `Variant ${variants.length + 1}`,
      email_subject: '',
      email_body: '',
      traffic_percentage: 0,
      sent_count: 0,
      opens: 0,
      clicks: 0,
      conversions: 0,
      open_rate: 0,
      click_rate: 0,
      conversion_rate: 0
    };
    onChange([...variants, newVariant]);
  };

  const removeVariant = (variantId) => {
    onChange(variants.filter(v => v.variant_id !== variantId));
  };

  const updateVariant = (variantId, updates) => {
    onChange(variants.map(v => 
      v.variant_id === variantId ? { ...v, ...updates } : v
    ));
  };

  const distributeTrafficEvenly = () => {
    const percentage = variants.length > 0 ? Math.floor(100 / variants.length) : 0;
    onChange(variants.map((v, idx) => ({
      ...v,
      traffic_percentage: idx === variants.length - 1 ? 100 - (percentage * (variants.length - 1)) : percentage
    })));
  };

  const generateVariantsWithAI = async () => {
    if (variants.length === 0 || !targetAudience) {
      alert('Please add at least one variant and specify target audience');
      return;
    }

    setIsGenerating(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      
      const prompt = `Generate ${variants.length} different email variants for an A/B test.
      
Target Audience: ${targetAudience}
Language: ${language}
Product: KG PROTECH - Automatic Fault Simulator for vehicles via internet

For each variant, create:
1. A compelling subject line (CONCISE, under 50 characters)
2. Email body (2-3 SHORT paragraphs, direct and professional)

Each variant should test a DIFFERENT approach:
- Variant 1: Value/ROI focused
- Variant 2: Problem/solution focused
- Variant 3: Social proof/urgency focused
- (Continue with unique angles for additional variants)

MANDATORY in ALL variants:
- Include: "📅 Schedule your 15-minute webinar: https://calendar.google.com/calendar/appointments/schedules/AcZssZ0H5P8VL5P_7YDKGZmLJZBQGgKpB5mTl8jC8yz8dXQr0YJZQ0?gv=true"
- End with signature:
Best regards,
Cintia Kimura
Founder and COO
cintia@kgprotech.com
Tel: +33 07 68 62 07 04

Return JSON array with ${variants.length} objects, each with: subject (string), body (string), approach (string)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  body: { type: "string" },
                  approach: { type: "string" }
                }
              }
            }
          }
        }
      });

      const updatedVariants = variants.map((v, idx) => ({
        ...v,
        email_subject: result.variants[idx]?.subject || v.email_subject,
        email_body: result.variants[idx]?.body || v.email_body,
        name: result.variants[idx]?.approach || v.name
      }));

      onChange(updatedVariants);
    } catch (error) {
      alert('Failed to generate variants. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalPercentage = variants.reduce((sum, v) => sum + (v.traffic_percentage || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-gray-300 text-base font-semibold">A/B Test Variants</Label>
        <div className="flex gap-2">
          {variants.length > 0 && (
            <>
              <Button
                onClick={distributeTrafficEvenly}
                size="sm"
                className="bg-[#333333] hover:bg-[#444444] text-white"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Split Evenly
              </Button>
              <Button
                onClick={generateVariantsWithAI}
                disabled={isGenerating}
                size="sm"
                className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </>
          )}
          <Button
            onClick={addVariant}
            size="sm"
            className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Variant
          </Button>
        </div>
      </div>

      {variants.length > 0 && (
        <div className="bg-[#333333] rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Traffic Allocation:</span>
            <Badge className={`${totalPercentage === 100 ? 'bg-green-600' : 'bg-red-600'} text-white border-0`}>
              {totalPercentage}%
            </Badge>
          </div>
          {totalPercentage !== 100 && (
            <p className="text-xs text-red-400 mt-2">
              Traffic allocation must equal 100% before launching
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {variants.map((variant, index) => (
          <div key={variant.variant_id} className="bg-[#333333] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Input
                  value={variant.name}
                  onChange={(e) => updateVariant(variant.variant_id, { name: e.target.value })}
                  placeholder={`Variant ${index + 1}`}
                  className="bg-[#2a2a2a] border-[#444444] text-white w-48"
                />
                <div className="flex items-center gap-2">
                  <Label className="text-gray-400 text-xs">Traffic:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={variant.traffic_percentage || 0}
                    onChange={(e) => updateVariant(variant.variant_id, { 
                      traffic_percentage: parseInt(e.target.value) || 0 
                    })}
                    className="bg-[#2a2a2a] border-[#444444] text-white w-20"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </div>
              <Button
                onClick={() => removeVariant(variant.variant_id)}
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1">Subject Line</Label>
              <Input
                value={variant.email_subject}
                onChange={(e) => updateVariant(variant.variant_id, { email_subject: e.target.value })}
                placeholder="Email subject line"
                className="bg-[#2a2a2a] border-[#444444] text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400 text-xs mb-1">Email Body</Label>
              <Textarea
                value={variant.email_body}
                onChange={(e) => updateVariant(variant.variant_id, { email_body: e.target.value })}
                placeholder="Email body content"
                rows={6}
                className="bg-[#2a2a2a] border-[#444444] text-white"
              />
            </div>

            {/* Show performance metrics if any */}
            {variant.sent_count > 0 && (
              <div className="grid grid-cols-4 gap-3 pt-3 border-t border-[#444444]">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Sent</p>
                  <p className="text-lg font-bold text-white">{variant.sent_count}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Opens</p>
                  <p className="text-lg font-bold text-[#00c600]">{variant.open_rate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Clicks</p>
                  <p className="text-lg font-bold text-blue-500">{variant.click_rate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Conv</p>
                  <p className="text-lg font-bold text-purple-500">{variant.conversion_rate}%</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {variants.length === 0 && (
        <div className="text-center py-8 bg-[#333333] rounded-lg border-2 border-dashed border-[#444444]">
          <p className="text-gray-400 mb-4">No A/B test variants configured</p>
          <Button
            onClick={addVariant}
            className="bg-[#00c600] hover:bg-[#00dd00] text-[#212121]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Variant
          </Button>
        </div>
      )}
    </div>
  );
}