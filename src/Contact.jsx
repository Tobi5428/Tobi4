import './Contact.css';

const Contact = () => {
  return (
    <div className="contact-page">
      <section className="contact-hero">
        <p className="contact-kicker">Contact JEGA</p>
        <h2>We are here to help you</h2>
        <p className="contact-intro">
          Reach out for account support, product questions, or business enquiries.
          Our team will get back to you as quickly as possible.
        </p>
      </section>

      <section className="contact-card" aria-label="Contact information">
        <article className="contact-item">
          <h3>Email</h3>
          <p className="contact-value">
            <a href="mailto:Jegainnovation@gmail.com">Jegainnovation@gmail.com</a>
          </p>
        </article>

        <article className="contact-item">
          <h3>Phone</h3>
          <p className="contact-value">
            <a href="tel:08137825867">08137825867</a>
          </p>
        </article>
      </section>
    </div>
  );
};

export default Contact;
