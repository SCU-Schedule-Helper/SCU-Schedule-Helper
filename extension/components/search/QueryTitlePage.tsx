import { Box, IconButton, Typography } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Props {
  handleBackButton: () => void;
  handleDialogOpen: () => void;
  showBackButton: boolean;
}

export default function QueryPageTitle({ handleBackButton, handleDialogOpen, showBackButton }: Props) {
    if (showBackButton) {
      return (
        <Box sx={{
          mb: "1rem"
        }}>

          <Typography
            sx={{
              mb: 3,
              alignSelf: "flex-start",
              ml: "1.3rem",
              fontSize: "1rem",
              margin: "0px 0px 0px 0px",
            }}
            variant="h6"
          >
            Search Course and Professor Information
            <IconButton
              sx={{
                ml: 0.5,
              }}
              onClick={handleDialogOpen}
              aria-label="info"
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            marginBottom: '1rem'
          }}
        >
          <IconButton
            sx={{
              alignSelf: "flex-start",
              mr: "1rem",
            }}
            onClick={() => handleBackButton()}
            aria-label="back"
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography
            sx={{
              mb: 3,
              ml: "1.3rem",
              fontSize: "1rem",
              margin: "3px 0px 0px 0px",
            }}
            variant="h6"
          >
            Search Course and Professor Information
            <IconButton
              sx={{
                ml: 0.5,
              }}
              onClick={handleDialogOpen}
              aria-label="info"
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Typography>
        </Box>
      );
    }
  }