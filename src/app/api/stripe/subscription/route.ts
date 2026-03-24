import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const PLAN_CONFIG = {
  profesional: {
    name: 'Plan Profesional — Escuela Digital MX',
    amount: 99900, // $999 MXN in cents
  },
  institucional: {
    name: 'Plan Institucional — Escuela Digital MX',
    amount: 199900, // $1,999 MXN in cents
  },
} as const

export async function POST(req: Request) {
  try {
    const { schoolId, plan, schoolName, email } = await req.json()

    if (!schoolId || !plan || !email) {
      return NextResponse.json({ error: 'Faltan datos requeridos.' }, { status: 400 })
    }

    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]
    if (!planConfig) {
      return NextResponse.json({ error: 'Plan no válido.' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: planConfig.name,
              description: `Suscripción mensual para ${schoolName || 'tu escuela'}`,
            },
            unit_amount: planConfig.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/plans?canceled=true`,
      customer_email: email,
      // metadata on the checkout session (accessible in checkout.session.completed)
      metadata: {
        schoolId,
        plan,
        type: 'school_subscription',
      },
      // metadata propagated to the subscription object (accessible in subscription events)
      subscription_data: {
        metadata: {
          schoolId,
          plan,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe Subscription Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
