import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './FAQ.css';

const FAQ_ITEMS = [
  {
    category: 'Account',
    question: 'How do I create a JEGA account?',
    answer:
      'Click Sign Up on the landing page, provide your details, create a password, and complete verification steps to activate your account.',
  },
  {
    category: 'Security',
    question: 'Why am I asked for an OTP when logging in?',
    answer:
      'JEGA uses email OTP verification as an extra security layer before dashboard access. This helps protect your account even if your password is exposed.',
  },
  {
    category: 'Account',
    question: 'What should I do if I forget my password?',
    answer:
      'Use the Forgot Password link on the login page. We will send a reset link to your registered email so you can create a new password.',
  },
  {
    category: 'Security',
    question: 'How long does an OTP remain valid?',
    answer:
      'Login OTP codes remain valid for 10 minutes. After that, you must request a new one from the verification screen.',
  },
  {
    category: 'Transfer',
    question: 'Can I transfer money to other banks?',
    answer:
      'Yes. JEGA supports transfers to other bank accounts. Always confirm the beneficiary name and account number before completing a transfer.',
  },
  {
    category: 'Transactions',
    question: 'How do I view my transaction history?',
    answer:
      'Open Transaction History from your dashboard to view credits, debits, transfer records, and payment activity. You can also filter and search records.',
  },
  {
    category: 'Transactions',
    question: 'Why is my transaction still pending?',
    answer:
      'Pending transactions may be waiting for confirmation from the payment or banking network. If the status does not change after some time, contact support.',
  },
  {
    category: 'Support',
    question: 'How can I contact JEGA support?',
    answer:
      'You can reach us through the Support page, send an email to Jegainnovation@gmail.com, or call 08137825867 for assistance.',
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = useMemo(
    () => ['All', ...new Set(FAQ_ITEMS.map((item) => item.category))],
    []
  );

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const categoryMatch = activeCategory === 'All' || item.category === activeCategory;
      const searchMatch =
        !search ||
        item.question.toLowerCase().includes(search) ||
        item.answer.toLowerCase().includes(search);
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, query]);

  const toggleItem = (index) => {
    setOpenIndex((current) => (current === index ? -1 : index));
  };

  return (
    <div className="faq-page">
      <div className="faq-shell">
        <header className="faq-hero">
          <p className="faq-kicker">Help Centre</p>
          <h2>Frequently Asked Questions</h2>
          <p className="faq-intro">
            Find quick answers about account access, transactions, security, and support.
          </p>
        </header>

        <section className="faq-controls" aria-label="FAQ controls">
          <input
            type="text"
            className="faq-search"
            placeholder="Search FAQ..."
            value={query}
            onChange={(event) => {
              setOpenIndex(-1);
              setQuery(event.target.value);
            }}
          />
          <div className="faq-category-row">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`faq-category-chip${activeCategory === category ? ' active' : ''}`}
                onClick={() => {
                  setOpenIndex(-1);
                  setActiveCategory(category);
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="faq-card">
          {filteredItems.length === 0 && (
            <p className="faq-empty">No FAQs match your search. Try a different keyword or category.</p>
          )}

          {filteredItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article key={item.question} className={`faq-item${isOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleItem(index)}
                  aria-expanded={isOpen}
                >
                  <span>
                    <small className="faq-category-label">{item.category}</small>
                    <strong>{item.question}</strong>
                  </span>
                  <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <p className="faq-answer">{item.answer}</p>}
              </article>
            );
          })}
        </section>

        <div className="faq-footer-links">
          <Link to="/support">Need more help?</Link>
          <Link to="/contact">Contact JEGA</Link>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
