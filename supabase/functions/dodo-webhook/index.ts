import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const payload = await req.json()
        console.log("Received Webhook Payload:", JSON.stringify(payload, null, 2))

        const { event_type, data } = payload

        // Handle multiple possible success event types
        const isSuccess = [
            'payment.succeeded',
            'order.succeeded',
            'subscription.created'
        ].includes(event_type)

        if (isSuccess) {
            // Dodo payloads can vary based on event version or type
            // Check both common locations for email
            const customerEmail = data?.customer?.email || data?.customer_email || data?.email
            const productId = data?.product_id

            if (!customerEmail) {
                console.error("Critical: Could not find customer email in payload data:", data)
                return new Response(JSON.stringify({ error: "No email found" }), { status: 400 })
            }

            console.log(`Processing ${event_type} for ${customerEmail} (Product ID: ${productId})`)

            // Map Dodo Product IDs to your app tiers
            let tier = 'Starter'
            if (productId === 'pdt_0NW89KALHGBo5694P8VWg') tier = 'Pro'
            if (productId === 'pdt_0NW89QFRYI2zzcocabqRS') tier = 'Enterprise'

            if (tier === 'Starter') {
                console.warn(`Unknown Product ID: ${productId}. No tier update performed.`);
            } else {
                // Initialize Supabase Admin Client
                const supabaseAdmin = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )

                // Update the user's tier
                // We use email because user_id might not be in the dodo payload
                const { data: updateData, error } = await supabaseAdmin
                    .from('profiles')
                    .update({ tier: tier })
                    .eq('email', customerEmail)
                    .select()

                if (error) {
                    console.error(`Database Update Error for ${customerEmail}:`, error)
                    throw error
                }

                if (!updateData || updateData.length === 0) {
                    console.error(`No profile found for email: ${customerEmail}. Data:`, updateData)
                    // Attempt to find user by lowercased email if case sensitivity is an issue
                    const { data: updateDataRetry, error: retryError } = await supabaseAdmin
                        .from('profiles')
                        .update({ tier: tier })
                        .ilike('email', customerEmail)
                        .select()

                    if (retryError || !updateDataRetry || updateDataRetry.length === 0) {
                        console.error(`Retry also failed for ${customerEmail}`)
                    } else {
                        console.log(`Successfully updated ${customerEmail} (retry) to ${tier}`)
                    }
                } else {
                    console.log(`Successfully updated ${customerEmail} to ${tier}. Result:`, updateData)
                }
            }
        } else {
            console.log(`Ignoring event type: ${event_type}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        })
    } catch (err) {
        console.error("Webhook Execution Failed:", err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400
        })
    }
})
