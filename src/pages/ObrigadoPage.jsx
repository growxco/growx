import React from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ObrigadoPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="growx-card p-8 max-w-xl w-full text-center shadow-lg">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Obrigado pelo seu contato!
        </h1>
        <p className="text-muted-foreground mb-6">
          Sua mensagem foi enviada com sucesso.  
          Em breve nossa equipe retornará.  
          Enquanto isso, explore mais sobre a Grow-X!
        </p>
        <Button onClick={() => navigate('/')} className="growx-btn-primary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a Página Inicial
        </Button>
      </div>
    </div>
  );
};

export default ObrigadoPage;
