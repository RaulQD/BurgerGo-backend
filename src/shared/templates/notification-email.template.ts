interface VerificationEmailTemplateParams {
  nameComplete: string;
  verificationCode: string;
}

export const getVerificationEmailTemplate = ({
  nameComplete,
  verificationCode,
}: VerificationEmailTemplateParams): string => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica tu cuenta</title>
        <style>
          body { font-family: Poppins, sans-serif; line-height: 1.6; color: #333;}
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header-flex { display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .content-flex { display: flex; flex-direction: column; align-items: center; justify-content: center}
          .content-bg {background: #FFFFFF; padding:30px; border-radius: 10px }
          .content-p { margin-top: 0px; margin-bottom: 10px; font-size: 30px; }
          .content-text { text-align: center; font-size:14px}
          .button { display: inline-block; background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-flex">
            <h1> Fast Burger</h1>
            <p>Verifica tu cuenta con tu código de seguridad</p>
            </div>
          </div>
          <div class="content">
            <h2>¡Hola ${nameComplete}!</h2>
            <p>Gracias por registrarte en Fast Burger. Para completar tu registro y empezar a disfrutar de nuestras deliciosas hamburguesas, necesitas verificar tu dirección de correo electrónico.</p>
            <div class="content-bg">
              <div class="content-flex">
                <p class="content-p">¡No compartas este código!</p>
                <p class="content-p">${verificationCode}</p>
              </div>
              <p class="content-text">Ten en cuenta que este código vence en 10 minutos.</p>
            </div>
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
