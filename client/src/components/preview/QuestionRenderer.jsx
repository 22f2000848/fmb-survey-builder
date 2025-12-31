import React from 'react';
import TabularDropDownRenderer from './TabularDropDownRenderer';
import MultipleChoiceSingleRenderer from './MultipleChoiceSingleRenderer';
import TabularTextInputRenderer from './TabularTextInputRenderer';
import TextResponseRenderer from './TextResponseRenderer';
import DropDownRenderer from './DropDownRenderer';
import MultipleChoiceMultiRenderer from './MultipleChoiceMultiRenderer';
import LikertScaleRenderer from './LikertScaleRenderer';
import CalendarRenderer from './CalendarRenderer';
import MediaUploadRenderer from './MediaUploadRenderer';

const QuestionRenderer = ({ question, language }) => {
  const translations = question.translations?.[language] || {};
  const questionDescription = translations.questionDescription || question.questionDescription || '';
  const isMandatory = question.isMandatory === 'Yes';

  const renderQuestionType = () => {
    const type = question.questionType;

    switch (type) {
      case 'Tabular Drop Down':
        return <TabularDropDownRenderer question={question} language={language} />;
      
      case 'Multiple Choice Single Select':
        return <MultipleChoiceSingleRenderer question={question} language={language} />;
      
      case 'Tabular Text Input':
        return <TabularTextInputRenderer question={question} language={language} />;
      
      case 'Text Response':
        return <TextResponseRenderer question={question} />;
      
      case 'Drop Down':
        return <DropDownRenderer question={question} language={language} />;
      
      case 'Multiple Choice Multi Select':
        return <MultipleChoiceMultiRenderer question={question} language={language} />;
      
      case 'Likert Scale':
        return <LikertScaleRenderer question={question} language={language} />;
      
      case 'Calendar':
        return <CalendarRenderer question={question} />;
      
      case 'Image Upload':
      case 'Video Upload':
      case 'Voice Response':
        return <MediaUploadRenderer question={question} />;
      
      case 'Tabular Check Box':
        // Similar to tabular text input but with checkboxes
        return <TabularTextInputRenderer question={question} language={language} />;
      
      default:
        return <div className="unsupported-question-type">Question type not supported in preview: {type}</div>;
    }
  };

  return (
    <div className="question-renderer">
      <div className="question-header">
        <span className="question-label">
          Question {question.questionId}
          {isMandatory && <span className="required-indicator"> *</span>}
        </span>
      </div>
      
      <div className="question-description">
        {questionDescription}
      </div>
      
      <div className="question-content">
        {renderQuestionType()}
      </div>
    </div>
  );
};

export default QuestionRenderer;
