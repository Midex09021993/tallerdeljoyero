import * as React from 'react'
import { render } from '@react-email/render'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "tallerdeljoyero"
const ROOT_DOMAIN = "tallerdeljoyero.com"

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://tallerdeljoyero.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  } satisfies React.ComponentProps<typeof SignupEmail>,
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  } satisfies React.ComponentProps<typeof MagicLinkEmail>,
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  } satisfies React.ComponentProps<typeof RecoveryEmail>,
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  } satisfies React.ComponentProps<typeof InviteEmail>,
  email_change: {
    siteName: SITE_NAME,
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  } satisfies React.ComponentProps<typeof EmailChangeEmail>,
  reauthentication: {
    token: '123456',
  } satisfies React.ComponentProps<typeof ReauthenticationEmail>,
}

async function renderEmailPreview(type: string): Promise<string | null> {
  switch (type) {
    case 'signup':
      return render(React.createElement(SignupEmail, SAMPLE_DATA.signup))
    case 'invite':
      return render(React.createElement(InviteEmail, SAMPLE_DATA.invite))
    case 'magiclink':
      return render(React.createElement(MagicLinkEmail, SAMPLE_DATA.magiclink))
    case 'recovery':
      return render(React.createElement(RecoveryEmail, SAMPLE_DATA.recovery))
    case 'email_change':
      return render(React.createElement(EmailChangeEmail, SAMPLE_DATA.email_change))
    case 'reauthentication':
      return render(React.createElement(ReauthenticationEmail, SAMPLE_DATA.reauthentication))
    default:
      return null
  }
}

export const Route = createFileRoute("/lovable/email/auth/preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']

        if (!apiKey) {
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 }
          )
        }

        // Verify the caller is authorized with LOVABLE_API_KEY
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let type: string
        try {
          const body: unknown = await request.json()
          if (
            typeof body !== 'object' ||
            body === null ||
            !('type' in body) ||
            typeof body.type !== 'string'
          ) {
            return Response.json(
              { error: 'Invalid email type in request body' },
              { status: 400 }
            )
          }
          type = body.type
        } catch {
          return Response.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          )
        }

        const html = await renderEmailPreview(type)

        if (html === null) {
          return Response.json(
            { error: `Unknown email type: ${type}` },
            { status: 400 }
          )
        }

        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
    },
  },
})
