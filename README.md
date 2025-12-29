# FMB Survey Builder

A comprehensive web application for creating and managing surveys with automatic Excel export functionality. Built for the FMB product to streamline survey creation and data collection.

## Features

- **Survey Management**: Create, edit, and delete surveys with comprehensive metadata
- **Question Builder**: Dynamic form-based question creation supporting 12 different question types
- **Parent-Child Questions**: Support for conditional questions based on parent responses
- **Excel Export**: Generate Excel dump sheets with exact formatting matching reference specifications
- **Upload Validation**: Validate CSV/XLSX files against schema before importing data
- **Enhanced Validation**: Comprehensive validation engine with cross-field validation
- **Validation**: Built-in validation rules ensuring data quality and format compliance
- **Multi-language Support**: Support for multiple languages/mediums per survey
- **Date Pickers**: Calendar-based date selection with time support

## Tech Stack

- **Frontend**: React 18 (functional components with hooks)
- **Backend**: Node.js with Express
- **Excel Generation**: ExcelJS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Storage**: JSON file-based storage

## Project Structure

```
fmb-survey-builder/
├── client/                          # React Frontend
│   ├── public/
│   │   └── index.html              # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── SurveyForm.jsx      # Survey creation/editing
│   │   │   ├── QuestionForm.jsx    # Dynamic question form
│   │   │   ├── QuestionList.jsx    # Question management
│   │   │   ├── SurveyList.jsx      # Survey listing
│   │   │   └── Navigation.jsx      # Navigation component
│   │   ├── hooks/
│   │   │   └── useValidation.js    # Form validation hooks
│   │   ├── schemas/
│   │   │   └── questionTypeSchema.js # Question type configurations
│   │   ├── services/
│   │   │   └── api.js              # API service layer
│   │   ├── App.jsx                 # Main app component
│   │   ├── App.css                 # Styling
│   │   └── index.jsx               # Entry point
│   └── package.json
├── server/                          # Node.js Backend
│   ├── routes/
│   │   ├── surveys.js              # Survey CRUD endpoints
│   │   └── export.js               # Excel export endpoint
│   ├── services/
│   │   ├── excelGenerator.js       # ExcelJS implementation
│   │   └── validator.js            # Server-side validation
│   ├── data/
│   │   └── store.json.template     # Data storage template
│   ├── schemas/
│   │   └── validationRules.js      # Validation rules
│   ├── app.js                      # Express app configuration
│   └── package.json
├── .gitignore
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Initialize data store:
```bash
cp data/store.json.template data/store.json
```

4. Start the server:
```bash
npm start
```

The server will start on `http://localhost:5000`

For development with auto-reload:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## Usage

### Creating a Survey

1. Click "Create New Survey" from the home page
2. Fill in all required survey details:
   - Survey ID (unique identifier, format: NAME_01)
   - Survey Name
   - Survey Description
   - Available languages (comma-separated)
   - Various settings (Public, In School, etc.)
   - Launch and Close dates (format: DD/MM/YYYY HH:MM:SS)
3. Click "Create Survey"

### Adding Questions

1. From the survey list, click "Manage Questions" for a survey
2. Click "Add Question"
3. Select the question type - form fields will dynamically adjust
4. Fill in required fields based on question type:
   - **Multiple Choice**: Add options with regional and English text
   - **Tabular Types**: Define table headers and questions in specified format
   - **Text Response**: Set input type and character limits
   - **Media Types**: Configure upload settings
5. For child questions, use format Q1.1, Q1.2 and specify parent in "Source Question"
6. Click "Add Question"

### Question Types Supported

1. **Multiple Choice Single Select** - Single option selection
2. **Multiple Choice Multi Select** - Multiple option selection
3. **Tabular Text Input** - Text input in table format
4. **Tabular Drop Down** - Dropdown selections in table
5. **Tabular Check Box** - Checkboxes in table format
6. **Text Response** - Free text input
7. **Image Upload** - Image file upload (6 MB limit)
8. **Video Upload** - Video file upload (10 MB limit)
9. **Voice Response** - Audio recording
10. **Likert Scale** - Rating scale questions
11. **Calendar** - Date picker
12. **Drop Down** - Single dropdown selection

### Exporting to Excel

1. Navigate to the questions page for a survey
2. Click "Export to Excel"
3. An Excel file will be downloaded with two sheets:
   - **Survey Master**: Survey metadata
   - **Question Master**: All questions with 84 columns in exact format

## API Endpoints

### Surveys

- `GET /api/surveys` - List all surveys
- `GET /api/surveys/:id` - Get survey by ID
- `POST /api/surveys` - Create new survey
- `PUT /api/surveys/:id` - Update survey
- `DELETE /api/surveys/:id` - Delete survey

### Questions

- `GET /api/surveys/:id/questions` - Get all questions for a survey
- `POST /api/surveys/:id/questions` - Add question to survey
- `PUT /api/surveys/:id/questions/:questionId` - Update question
- `DELETE /api/surveys/:id/questions/:questionId` - Delete question

### Export

- `GET /api/export/:surveyId` - Download Excel dump for survey

### Validation

- `POST /api/validate-upload` - Validate CSV/XLSX file (query param: schema=survey|question|both)
- `GET /api/validation-schema` - Get validation rules schema

### Health Check

- `GET /api/health` - Server health check

## Validation Rules

### Survey Validation

- **Survey ID**: Required, alphanumeric + underscore only (no spaces), pattern: `^[A-Za-z0-9_]+$`
- **Survey Name**: Required, max 99 characters
- **Survey Description**: Required, max 256 characters
- **Available Mediums**: Required, must be from: English, Hindi, Gujarati, Marathi, Tamil, Telugu, Bengali, Bodo, Punjabi, Assamese
- **Hierarchical Access Level**: Required, numeric values (1-7), comma-separated, no duplicates
- **Date Format**: Must be DD/MM/YYYY HH:MM:SS or DD/MM/YYYY
- **Date Comparison**: Close Date must be >= Launch Date
- **Yes/No Fields**: Must be exactly "Yes" or "No" (public, inSchool, acceptMultipleEntries, isActive, downloadResponse, geoFencing, geoTagging, testSurvey, visibleOnReportBot)
- **Mode**: Must be one of: New Data, Correction, Delete Data, None
- **Geo Fencing/Tagging**: If Geo Fencing is "Yes", Geo Tagging must also be "Yes"

### Question Validation

**Tabular Types:**
- Table_Header_value and Table_Question_value are mandatory
- Table_Question_value format: `a:Question 1\nb:Question 2`
- Maximum 20 questions, 100 characters each
- For Tabular Drop Down: Text_input_type must be "None"

**Multiple Choice:**
- Text_input_type must be "None"
- Question_Media_Type must be "None"
- At least 2 options required, maximum 20

**Text Response:**
- Default character limit: 1024
- Max/Min values apply when text_input_type is "Numeric"

**Parent-Child Questions:**
- Child Question_ID format: Q1.1, Q1.2, etc.
- Source_Question must reference parent
- OptionChildren specifies triggering options

## Upload Validation

The FMB Survey Builder now includes a powerful upload validation feature that allows you to validate your CSV or Excel files before importing data into the system.

### How to Use Upload Validation

1. Navigate to **"Validate Upload"** from the navigation menu
2. Select your file (CSV or XLSX format)
3. Choose the schema to validate against:
   - **Survey Master** - validates survey data only
   - **Question Master** - validates question data only
   - **Both** - validates both sheets (for XLSX files with multiple sheets)
4. Click **"Validate"**
5. Review any errors in the results table
6. Optionally download errors as CSV for offline review

### Supported File Formats

- **CSV (.csv)** - UTF-8 encoded, comma-separated values
- **Excel (.xlsx, .xls)** - Microsoft Excel format with one or more sheets

### Validation Features

- **Comprehensive Error Detection**: Validates all rows and collects all errors (does not fail fast)
- **Field-Level Validation**: Checks each field against defined rules (required, pattern, length, enum, etc.)
- **Cross-Field Validation**: Validates relationships between fields (e.g., Geo Fencing/Tagging)
- **Cross-Record Validation**: Validates references between records (e.g., Question medium matches Survey mediums)
- **Detailed Error Report**: Shows row number, sheet name, field name, error message, and invalid value
- **Export Errors**: Download validation errors as CSV for easy sharing and tracking

### Validation Results

The validation results include:
- **Summary Statistics**: Total rows, rows with errors, total error count
- **Error Details Table**: Complete list of all validation errors with context
- **Success Indicator**: Clear visual feedback when all rows pass validation

### Example Validation Errors

- Survey ID with spaces: `SB WV 01` → "Survey ID must contain only alphanumeric characters and underscores"
- Survey Name too long (>99 chars) → "surveyName must not exceed 99 characters"
- Invalid date format: `2025-08-11` → "Launch Date must be in DD/MM/YYYY HH:MM:SS or DD/MM/YYYY format"
- Close Date < Launch Date → "Close Date must be greater than or equal to Launch Date"
- Duplicate hierarchy levels: `1,1,2` → "Hierarchical Access Level must not contain duplicate values"
- Geo Fencing without Geo Tagging → "Geo Tagging must be 'Yes' when Geo Fencing is 'Yes'"
- Invalid Question ID: `Question1` → "Question ID must be in format Q1, Q1.1, Q5.2, etc."

## Excel Format

### Survey Master Sheet (17 columns)
Survey ID, Survey Name, Survey Description, available_mediums, Hierarchical Access Level, Public, In School, Accept multiple Entries, Launch Date, Close Date, Mode, visible_on_report_bot, Is Active?, Download_response, Geo Fencing, Geo Tagging, Test Survey

### Question Master Sheet (84 columns)
Survey ID, Medium, Medium_in_english, Question_ID, Question Type, IsDynamic, Question_Description_Optional, Max_Value, Min_Value, Is Mandatory, Table_Header_value, Table_Question_value, Source_Question, Text_input_type, text_limit_characters, Mode, Question_Media_Link, Question_Media_Type, Question Description, Question Description_in_english, Option_1 through Option_20 (with English and Children columns for each), Correct_Answer_Optional, Children Questions, Outcome Description

## Design Decisions & Assumptions

1. **Storage**: Using JSON file-based storage for simplicity. For production, migrate to a proper database (MongoDB, PostgreSQL, etc.)

2. **Authentication**: No authentication implemented. Add authentication/authorization for production use.

3. **File Uploads**: Media upload functionality is configured but actual file handling would require additional middleware (e.g., multer) and storage solution (e.g., AWS S3).

4. **Validation**: Both client-side and server-side validation implemented. Server validation is authoritative.

5. **Date Format**: Using DD/MM/YYYY HH:MM:SS format as specified. No timezone handling implemented.

6. **Excel Format**: Generated Excel files match the exact column order and naming from specifications. All 84 columns in Question Master sheet are included.

7. **Child Questions**: Parent questions must be created before child questions. The UI sorts questions to show parents first.

8. **Languages**: Survey supports multiple languages via the "available_mediums" field. Each question can specify its language in the "medium" field.

9. **Error Handling**: Comprehensive error handling with user-friendly messages. Console logging for debugging.

10. **Responsive Design**: UI is responsive and works on desktop and tablet devices.

## Security Considerations

This is a prototype/development application. For production deployment, consider:

1. **Rate Limiting**: Add rate limiting to prevent abuse of API endpoints
2. **Authentication & Authorization**: Implement user authentication and role-based access control
3. **Input Sanitization**: Add additional input sanitization to prevent injection attacks
4. **HTTPS**: Deploy with HTTPS in production
5. **CORS Configuration**: Restrict CORS to specific domains in production
6. **File Upload Security**: If implementing media uploads, add file type validation, size limits, and virus scanning

## Future Enhancements

- Database integration (MongoDB/PostgreSQL)
- User authentication and role-based access
- Rate limiting on API endpoints
- Actual file upload and storage for media questions
- Survey preview functionality
- Bulk question import from CSV
- Survey duplication/cloning
- Question reordering via drag-and-drop
- Advanced search and filtering
- Survey analytics and reporting
- Multi-tenant support
- Internationalization (i18n) for UI text
- Toast notifications instead of browser alerts
- More robust date validation
- Shared validation constants between client and server

## Development

### Running Tests

Currently, no tests are implemented. To add tests:

```bash
# Frontend tests
cd client
npm test

# Backend tests (add test framework first)
cd server
npm test
```

### Building for Production

```bash
# Build frontend
cd client
npm run build

# The build files will be in client/build/
# Configure server to serve these static files
```

### Environment Variables

Create `.env` files for configuration:

**Server (.env in server/):**
```
PORT=5000
NODE_ENV=production
```

**Client (.env in client/):**
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Troubleshooting

### Port Already in Use

If port 5000 or 3000 is already in use:

```bash
# Change server port
PORT=5001 npm start

# Change client port
PORT=3001 npm start
```

### CORS Issues

If you encounter CORS issues, ensure the backend CORS configuration allows your frontend origin.

### Excel Export Not Working

Ensure all survey and question data is properly saved before exporting. Check browser console for errors.

## License

ISC

## Author

FMB Survey Builder Team

## Support

For issues or questions, please create an issue in the repository.
