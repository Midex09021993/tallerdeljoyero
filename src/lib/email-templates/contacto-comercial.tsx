import * as React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'

type ContactData = {
  nombre?: string
  email?: string
  telefono?: string
  interes?: string
  mensaje?: string
}

const labels: Record<string, string> = {
  aurum_lab: 'AURUM LAB',
  aurum_render: 'Aurum Render',
  joya_personalizada: 'Diseño o fabricación de una joya',
  otra_consulta: 'Otra consulta',
}

function BaseEmail({ children, preview }: { children: React.ReactNode; preview: string }) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f5f3ee', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e4dcc8', borderRadius: '12px', margin: '0 auto', maxWidth: '600px', padding: '32px' }}>
          <Text style={{ color: '#9b7b35', fontSize: '12px', fontWeight: 700, letterSpacing: '3px' }}>TALLER DEL JOYERO</Text>
          {children}
          <Hr style={{ borderColor: '#e8e2d5', margin: '28px 0 16px' }} />
          <Text style={{ color: '#77736b', fontSize: '12px' }}>Contacto recibido desde tallerdeljoyero.com</Text>
        </Container>
      </Body>
    </Html>
  )
}

export function ContactoAdminEmail(data: Record<string, unknown>) {
  const info = data as ContactData
  return (
    <BaseEmail preview={`Nueva consulta comercial de ${info.nombre || 'un visitante'}`}>
      <Heading style={{ color: '#211f1a', fontSize: '24px' }}>Nueva consulta desde la web</Heading>
      <Text style={{ color: '#3f3b32', fontSize: '14px' }}>Una persona quiere conocer mejor lo que ofrecemos.</Text>
      <Section style={{ backgroundColor: '#faf8f2', borderRadius: '8px', padding: '18px' }}>
        <Text style={{ color: '#24221d', fontSize: '14px' }}><strong>Nombre:</strong> {info.nombre}</Text>
        <Text style={{ color: '#24221d', fontSize: '14px' }}><strong>Correo:</strong> {info.email}</Text>
        <Text style={{ color: '#24221d', fontSize: '14px' }}><strong>Teléfono:</strong> {info.telefono || 'No indicado'}</Text>
        <Text style={{ color: '#24221d', fontSize: '14px' }}><strong>Interés:</strong> {labels[info.interes || ''] || info.interes}</Text>
        <Text style={{ color: '#24221d', fontSize: '14px', whiteSpace: 'pre-wrap' }}><strong>Mensaje:</strong>{' '}{info.mensaje}</Text>
      </Section>
      <Text style={{ color: '#6f5728', fontSize: '13px' }}>Puedes responder directamente a este correo: la dirección del visitante se configura como Reply-To.</Text>
    </BaseEmail>
  )
}

export function ContactoVisitanteEmail(data: Record<string, unknown>) {
  const info = data as ContactData
  return (
    <BaseEmail preview="Hemos recibido tu consulta">
      <Heading style={{ color: '#211f1a', fontSize: '24px' }}>Gracias por escribirnos, {info.nombre || '¡hola'}.</Heading>
      <Text style={{ color: '#3f3b32', fontSize: '15px', lineHeight: '1.7' }}>Hemos recibido tu consulta sobre <strong>{labels[info.interes || ''] || 'nuestros servicios'}</strong>. El equipo de Taller del Joyero la revisará y se pondrá en contacto contigo.</Text>
      <Text style={{ color: '#3f3b32', fontSize: '14px', lineHeight: '1.7' }}>Si necesitas añadir información, puedes responder a este correo.</Text>
    </BaseEmail>
  )
}
