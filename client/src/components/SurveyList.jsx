import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { surveyAPI } from '../services/api';

const SurveyList = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await surveyAPI.getAll();
      setSurveys(data);
      setError(null);
    } catch (err) {
      setError('Failed to load surveys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (surveyId) => {
    if (window.confirm('Are you sure you want to delete this survey? All associated questions will also be deleted.')) {
      try {
        await surveyAPI.delete(surveyId);
        loadSurveys();
      } catch (err) {
        alert('Failed to delete survey');
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading surveys...</div>;
  }

  return (
    <div className="survey-list-container">
      <div className="list-header">
        <h2>Surveys</h2>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/surveys/new')}
        >
          Create New Survey
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {surveys.length === 0 ? (
        <div className="empty-state">
          <p>No surveys found. Create your first survey to get started.</p>
        </div>
      ) : (
        <div className="survey-grid">
          {surveys.map(survey => (
            <div key={survey.surveyId} className="survey-card">
              <div className="survey-card-header">
                <h3>{survey.surveyName}</h3>
                <span className="survey-id">{survey.surveyId}</span>
              </div>
              <p className="survey-description">{survey.surveyDescription}</p>
              <div className="survey-meta">
                <span className="badge">{survey.isActive === 'Yes' ? 'Active' : 'Inactive'}</span>
                <span className="badge">{survey.public === 'Yes' ? 'Public' : 'Private'}</span>
              </div>
              <div className="survey-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/surveys/${survey.surveyId}/questions`)}
                >
                  Manage Questions
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/surveys/${survey.surveyId}/edit`)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(survey.surveyId)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyList;
