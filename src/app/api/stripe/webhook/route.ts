
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { initializeFirebase } from '@/firebase';
import { doc, collection, addDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler.
 * Handles both:
 *  1. Student one-time payments (checkout.session.completed with studentId metadata)
 *  2. School subscriptions (checkout.session.completed with type='school_subscription' metadata,
 *     plus customer.subscription.updated and customer.subscription.deleted)
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const { firestore } = initializeFirebase();

  // ── School Subscription: Checkout Completed ──────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    // Case 1: School subscription checkout
    if (metadata?.type === 'school_subscription' && metadata?.schoolId) {
      try {
        const schoolRef = doc(firestore, 'schools', metadata.schoolId);
        await updateDoc(schoolRef, {
          subscriptionStatus: 'active',
          plan: metadata.plan,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          updatedAt: serverTimestamp(),
        });
        console.log(`School subscription activated: ${metadata.schoolId} (${metadata.plan})`);
      } catch (error) {
        console.error('Error activating school subscription:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }

    // Case 2: Student one-time payment
    if (metadata?.studentId && metadata?.schoolId && metadata?.type !== 'school_subscription') {
      try {
        const studentId = metadata.studentId;
        const schoolId = metadata.schoolId;
        const amountPaid = session.amount_total ? session.amount_total / 100 : 0;

        const studentRef = doc(firestore, 'students', studentId);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          const currentBalance = studentSnap.data().outstandingBalance || 0;
          const newBalance = Math.max(0, currentBalance - amountPaid);

          await updateDoc(studentRef, {
            outstandingBalance: newBalance,
            updatedAt: serverTimestamp(),
          });

          const paymentsRef = collection(firestore, 'students', studentId, 'payments');
          await addDoc(paymentsRef, {
            schoolId,
            studentId,
            studentName: metadata.studentName || 'Alumno',
            totalAmount: amountPaid,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'Stripe Online',
            stripeSessionId: session.id,
            receivedFrom: session.customer_details?.name || 'Pago en Línea',
            remainingBalanceAfterThis: newBalance,
            status: 'completado',
            items: [
              {
                id: 'stripe-' + Date.now(),
                name: 'Pago en Línea (Stripe)',
                amount: amountPaid,
                type: 'online',
              },
            ],
            createdAt: serverTimestamp(),
          });

          console.log(`Student payment processed: ${studentId} — $${amountPaid}`);
        }
      } catch (error) {
        console.error('Error updating Firestore from webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }
  }

  // ── School Subscription: Status Changed ──────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const schoolId = subscription.metadata?.schoolId;
    if (schoolId) {
      try {
        await updateDoc(doc(firestore, 'schools', schoolId), {
          subscriptionStatus: subscription.status,
          updatedAt: serverTimestamp(),
        });
        console.log(`School subscription updated: ${schoolId} → ${subscription.status}`);
      } catch (error) {
        console.error('Error updating subscription status:', error);
      }
    }
  }

  // ── School Subscription: Canceled ────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const schoolId = subscription.metadata?.schoolId;
    if (schoolId) {
      try {
        await updateDoc(doc(firestore, 'schools', schoolId), {
          subscriptionStatus: 'canceled',
          updatedAt: serverTimestamp(),
        });
        console.log(`School subscription canceled: ${schoolId}`);
      } catch (error) {
        console.error('Error canceling subscription in Firestore:', error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
