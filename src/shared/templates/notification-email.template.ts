interface VerificationEmailTemplateParams {
    name: string;
    verificationCode: string;
    verificationUrl: string;
}

export const getVerificationEmailTemplate = ({
    name,
    verificationCode,
    verificationUrl,
}: VerificationEmailTemplateParams): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica tu cuenta</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍔 Fast Burger</h1>
            <p>¡Verifica tu cuenta!</p>
          </div>
          <div class="content">
            <h2>¡Hola ${name}!</h2>
            <p>Gracias por registrarte en Fast Burger. Para completar tu registro y empezar a disfrutar de nuestras deliciosas hamburguesas, necesitas verificar tu dirección de correo electrónico.</p>
            <p>Tienes que ingresar este código:${verificationCode}</p>
            <p>Haz clic en el siguiente botón para verificar tu cuenta:</p>
            
            <a href="${verificationUrl}" class="button">Verificar mi cuenta</a>
            
            <p>Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            
            <p><strong>Importante:</strong> Este enlace expirará en 24 horas por seguridad.</p>
            
            <p>Si no creaste esta cuenta, puedes ignorar este email.</p>
            
            <p>¡Esperamos verte pronto!<br>
            El equipo de Fast Burger</p>
          </div>
          <div class="footer">
            <p>© 2025 Fast Burger. Todos los derechos reservados.</p>
            <p>Si tienes problemas, contáctanos en soporte@fastburger.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

export const getWelcomeEmailTemplate = (name: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Bienvenido!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a Fast Burger!</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${name}!</h2>
            <p>¡Tu cuenta ha sido verificada exitosamente! Ya puedes disfrutar de todos nuestros servicios:</p>
            
            <ul>
              <li>🍔 Pide tus hamburguesas favoritas</li>
              <li>🚚 Delivery rápido a tu domicilio</li>
              <li>⭐ Acumula puntos de lealtad</li>
              <li>🎁 Ofertas especiales exclusivas</li>
              <li>📱 Guarda tus direcciones favoritas</li>
            </ul>
            
            <div class="highlight">
              <strong>🎁 ¡Oferta de bienvenida!</strong><br>
              Usa el código <strong>BIENVENIDO10</strong> en tu primera orden y obtén 10% de descuento.
            </div>
            
            <p>¿Listo para tu primera orden? ¡Visita nuestra página y descubre nuestro menú!</p>
            
            <p>Si tienes alguna pregunta, nuestro equipo de soporte está aquí para ayudarte.</p>
            
            <p>¡Que disfrutes tu experiencia con Fast Burger!<br>
            El equipo de Fast Burger</p>
          </div>
          <div class="footer">
            <p>© 2025 Fast Burger. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};
