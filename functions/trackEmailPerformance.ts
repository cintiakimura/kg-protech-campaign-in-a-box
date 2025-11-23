import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { lead_id, action } = await req.json();
    
    if (!lead_id || !action) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get the lead
    const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id });
    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leads[0];
    
    // Update lead performance tracking
    const updates = {};
    if (action === 'open') {
      updates.email_opened = true;
    } else if (action === 'click') {
      updates.email_clicked = true;
      updates.email_opened = true; // If they clicked, they must have opened
    } else if (action === 'convert') {
      updates.email_converted = true;
      updates.email_opened = true;
      updates.email_clicked = true;
    }

    await base44.asServiceRole.entities.Lead.update(lead_id, updates);

    // Update campaign variant statistics
    if (lead.campaign_id && lead.ab_test_variant_id) {
      const campaigns = await base44.asServiceRole.entities.Campaign.filter({ 
        id: lead.campaign_id 
      });
      
      if (campaigns.length > 0) {
        const campaign = campaigns[0];
        
        if (campaign.ab_test_variants) {
          const updatedVariants = campaign.ab_test_variants.map(variant => {
            if (variant.variant_id === lead.ab_test_variant_id) {
              const updates = { ...variant };
              
              if (action === 'open') {
                updates.opens = (variant.opens || 0) + 1;
              } else if (action === 'click') {
                updates.clicks = (variant.clicks || 0) + 1;
                if (!lead.email_opened) {
                  updates.opens = (variant.opens || 0) + 1;
                }
              } else if (action === 'convert') {
                updates.conversions = (variant.conversions || 0) + 1;
                if (!lead.email_clicked) {
                  updates.clicks = (variant.clicks || 0) + 1;
                }
                if (!lead.email_opened) {
                  updates.opens = (variant.opens || 0) + 1;
                }
              }

              // Recalculate rates
              const sent = variant.sent_count || 1;
              updates.open_rate = ((updates.opens || 0) / sent * 100).toFixed(1);
              updates.click_rate = ((updates.clicks || 0) / sent * 100).toFixed(1);
              updates.conversion_rate = ((updates.conversions || 0) / sent * 100).toFixed(1);

              return updates;
            }
            return variant;
          });

          await base44.asServiceRole.entities.Campaign.update(lead.campaign_id, {
            ab_test_variants: updatedVariants
          });
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error tracking email performance:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});