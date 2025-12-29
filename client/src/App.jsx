import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import SurveyList from './components/SurveyList';
import SurveyForm from './components/SurveyForm';
import QuestionList from './components/QuestionList';
import QuestionForm from './components/QuestionForm';
import UploadValidator from './components/UploadValidator';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<SurveyList />} />
            <Route path="/surveys/new" element={<SurveyForm />} />
            <Route path="/surveys/:surveyId/edit" element={<SurveyForm />} />
            <Route path="/surveys/:surveyId/questions" element={<QuestionList />} />
            <Route path="/surveys/:surveyId/questions/new" element={<QuestionForm />} />
            <Route path="/surveys/:surveyId/questions/:questionId/edit" element={<QuestionForm />} />
            <Route path="/validate-upload" element={<UploadValidator />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
