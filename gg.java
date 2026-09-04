import java.util.Scanner;

public class TicTacToe {

    static char[][] board = {
        {' ', ' ', ' '},
        {' ', ' ', ' '},
        {' ', ' ', ' '}
    };

    static char currentPlayer = 'X';

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.println("=== TIC-TAC-TOE ===");

        while (true) {
            printBoard();

            System.out.println("Player " + currentPlayer + ", enter row and column (1-3):");
            int row = sc.nextInt() - 1;
            int col = sc.nextInt() - 1;

            // Check if the move is valid
            if (row < 0 || row > 2 || col < 0 || col > 2) {
                System.out.println("Invalid position! Try again.");
                continue;
            }

            if (board[row][col] != ' ') {
                System.out.println("That position is already occupied!");
                continue;
            }

            // Place the player's mark
            board[row][col] = currentPlayer;

            // Check for winner
            if (checkWinner()) {
                printBoard();
                System.out.println("Player " + currentPlayer + " wins!");
                break;
            }

            // Check for draw
            if (isBoardFull()) {
                printBoard();
                System.out.println("It's a draw!");
                break;
            }

            // Change player
            currentPlayer = (currentPlayer == 'X') ? 'O' : 'X';
        }

        sc.close();
    }

    // Display the board
    static void printBoard() {
        System.out.println();
        System.out.println(" " + board[0][0] + " | " + board[0][1] + " | " + board[0][2]);
        System.out.println("---+---+---");
        System.out.println(" " + board[1][0] + " | " + board[1][1] + " | " + board[1][2]);
        System.out.println("---+---+---");
        System.out.println(" " + board[2][0] + " | " + board[2][1] + " | " + board[2][2]);
        System.out.println();
    }

    // Check whether someone has won
    static boolean checkWinner() {

        // Check rows
        for (int i = 0; i < 3; i++) {
            if (board[i][0] != ' ' &&
                board[i][0] == board[i][1] &&
                board[i][1] == board[i][2]) {
                return true;
            }
        }

        // Check columns
        for (int i = 0; i < 3; i++) {
            if (board[0][i] != ' ' &&
                board[0][i] == board[1][i] &&
                board[1][i] == board[2][i]) {
                return true;
            }
        }

        // Check diagonals
        if (board[0][0] != ' ' &&
            board[0][0] == board[1][1] &&
            board[1][1] == board[2][2]) {
            return true;
        }

        if (board[0][2] != ' ' &&
            board[0][2] == board[1][1] &&
            board[1][1] == board[2][0]) {
            return true;
        }

        return false;
    }

    // Check if the board is full
    static boolean isBoardFull() {
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (board[i][j] == ' ') {
                    return false;
                }
            }
        }
        return true;
    }
}