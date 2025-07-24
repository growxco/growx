import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  MessageCircle,
  Linkedin,
  Instagram,
  Facebook,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };



  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container text-center">
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
            <MessageCircle className="w-4 h-4 mr-2" />
            Entre em Contato Conosco
          </div>
          <h1 className="growx-title mb-6">
            Vamos Conversar sobre seu <span className="text-primary">Projeto</span>
          </h1>
          <p className="growx-subtitle max-w-3xl mx-auto mb-12">
            Nossa equipe de especialistas está pronta para ajudar você a transformar sua operação
            com tecnologia de ponta. Entre em contato e descubra como podemos colaborar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => window.open('https://wa.me/5541995494343', '_blank')} className="growx-btn-primary">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Direto
            </Button>
            <Button variant="outline">
              <Phone className="w-4 h-4 mr-2" />
              Ligar Agora
            </Button>
          </div>
        </div>
      </section>

      {/* Formulário de Contato */}
      <section className="growx-section">
        <div className="growx-container grid lg:grid-cols-2 gap-12">
          <div className="growx-card p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Envie sua Mensagem
            </h2>

            <form
              action="https://formsubmit.co/growx@growx.com.br"
              method="POST"
              className="space-y-6"
            >
              {/* Anti-spam */}
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_next" value="https://www.growx.com.br/obrigado" />

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nome Completo *</label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">E-mail *</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Empresa</label>
                  <Input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Nome da empresa"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Assunto *</label>
                <Input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Qual o assunto da sua mensagem?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Mensagem *</label>
                <Textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Descreva seu projeto ou dúvida..."
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full growx-btn-primary">
                <Send className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
