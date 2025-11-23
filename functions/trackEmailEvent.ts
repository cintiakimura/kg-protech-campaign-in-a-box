import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { lead_id, event_type, campaign_id, variant_id } = await req.json();

    if (!lead_id || !event_type || !campaign_id) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Update lead tracking
    const lead = await base44.entities.Lead.filter({ id: lead_id });
    if (lead.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const updateData = {};
    if (event_type === 'open') {
      updateData.email_opened = true;
    } else if (event_type === 'click') {
      updateData.email_clicked = true;
    } else if (event_type === 'convert') {
      updateData.converted = true;
    }

    await base44.asServiceRole.entities.Lead.update(lead_id, updateData);

    // Update campaign variant metrics
    if (variant_id) {
      const campaigns = await base44.entities.Campaign.filter({ id: campaign_id });
      if (campaigns.length > 0) {
        const campaign = campaigns[0];
        
        if (campaign.ab_test_variants) {
          const variantIndex = campaign.ab_test_variants.findIndex(v => v.variant_id === variant_id);
          
          if (variantIndex !== -1) {
            const variant = campaign.ab_test_variants[variantIndex];
            
            if (event_type === 'open') {
              variant.opens = (variant.opens || 0) + 1;
              variant.open_rate = variant.sent_count > 0 ? (variant.opens / variant.sent_count) * 100 : 0;
            } else if (event_type === 'click') {
              variant.clicks = (variant.clicks || 0) + 1;
              variant.click_rate = variant.sent_count > 0 ? (variant.clicks / variant.sent_count) * 100 : 0;
            } else if (event_type === 'convert') {
              variant.conversions = (variant.conversions || 0) + 1;
              variant.conversion_rate = variant.sent_count > 0 ? (variant.conversions / variant.sent_count) * 100 : 0;
            }

            await base44.asServiceRole.entities.Campaign.update(campaign_id, {
              ab_test_variants: campaign.ab_test_variants
            });
          }
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});