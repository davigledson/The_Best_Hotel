package com.the.best.hotel.theBestHotel.config;

import com.the.best.hotel.theBestHotel.model.Client;
import com.the.best.hotel.theBestHotel.model.Employee;
import com.the.best.hotel.theBestHotel.model.Product;
import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.ClientRepository;
import com.the.best.hotel.theBestHotel.repository.EmployeeRepository;
import com.the.best.hotel.theBestHotel.repository.ProductRepository;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import com.the.best.hotel.theBestHotel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final ClientRepository clientRepository;
    private final RoomRepository roomRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    private static final Random RNG = new Random();

    private static final List<String> TIPOS_QUARTO = List.of("Standard", "Deluxe", "Master Suite", "Presidential Suite");

    private static final List<String> PRODUTO_NOME = List.of(
            "Agua mineral", "Suco", "Refrigerante", "Cerveja", "Vinho",
            "Cafe", "Cha", "Leite", "Salgadinho", "Biscoito",
            "Chocolate", "Sorvete", "Barra de cereal", "Pao", "Sanduiche",
            "Agua tonica", "Energético", "Isotonico", "Queijo", "Presunto"
    );

    private static final List<String> PRODUTO_DETALHE = List.of(
            "natural", "com acucar", "diet", "zero", "artesanal",
            "importado", "tradicional", "premium", "integral", "light",
            "torrado", "moido", "em po", "lata", "garrafa"
    );

    private static final List<String> PRODUTO_CATEGORIA = List.of(
            "Bebidas", "Alimentos", "Higiene", "Diversos"
    );

    @Override
    public void run(String... args) {
        createIfNotExists("admin@gmail.com", "admin123", User.Role.ADMIN);
        createIfNotExists("funcionario@gmail.com", "func123", User.Role.EMPLOYEE);
        createIfNotExists("cliente@gmail.com", "cliente123", User.Role.CLIENT);

        seedRooms(10);
        seedProducts(15);
    }

    private void createIfNotExists(String email, String password, User.Role role) {
        if (userRepository.existsByEmail(email)) return;

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);

        user = userRepository.save(user);

        if (role == User.Role.EMPLOYEE) {
            Employee emp = new Employee();
            emp.setName("Funcionario " + email);
            emp.setCpf("000.000.000-01");
            emp.setPhone("(11) 99999-0000");
            emp.setUserId(user.getId());
            emp = employeeRepository.save(emp);
            user.setRefId(emp.getId());
            userRepository.save(user);
        } else if (role == User.Role.CLIENT) {
            Client cli = new Client();
            cli.setName("Cliente " + email);
            cli.setCpf("000.000.000-02");
            cli.setEmail(email);
            cli.setPhone("(11) 99999-0001");
            cli.setAddress("Endereco padrao");
            cli = clientRepository.save(cli);
            user.setRefId(cli.getId());
            userRepository.save(user);
        }

        System.out.println("Usuario criado: " + email + " (" + role + ")");
    }

    private void seedRooms(int n) {
        if (roomRepository.count() > 0) return;

        java.util.HashMap<String, Integer> contador = new java.util.HashMap<>();

        for (int i = 0; i < n; i++) {
            String tipo = TIPOS_QUARTO.get(RNG.nextInt(TIPOS_QUARTO.size()));
            int prefixo = TIPOS_QUARTO.indexOf(tipo) + 1;
            int seq = contador.merge(tipo, 1, Integer::sum);
            int capacidade;
            double diaria;

            switch (tipo) {
                case "Deluxe" -> {
                    capacidade = RNG.nextInt(2, 5);
                    diaria = RNG.nextInt(250, 451);
                }
                case "Master Suite" -> {
                    capacidade = 2;
                    diaria = RNG.nextInt(500, 801);
                }
                case "Presidential Suite" -> {
                    capacidade = RNG.nextInt(2, 7);
                    diaria = RNG.nextInt(900, 1501);
                }
                default -> {
                    capacidade = RNG.nextInt(2, 4);
                    diaria = RNG.nextInt(120, 201);
                }
            }

            String numero = prefixo + String.format("%02d", seq);

            Room room = new Room();
            room.setNumber(numero);
            room.setType(tipo);
            room.setDescription("Quarto " + tipo + " com capacidade para " + capacidade + " pessoas");
            room.setCapacity(capacidade);
            room.setDailyRate(diaria);
            room.setStatus(Room.Status.AVAILABLE);

            roomRepository.save(room);
            System.out.println("Quarto criado: " + numero + " (" + tipo + ")");
        }
    }

    private void seedProducts(int n) {
        if (productRepository.count() > 0) return;

        Set<String> usados = new HashSet<>();

        for (int i = 0; i < n; i++) {
            String nome;
            do {
                nome = PRODUTO_NOME.get(RNG.nextInt(PRODUTO_NOME.size()))
                        + " " + PRODUTO_DETALHE.get(RNG.nextInt(PRODUTO_DETALHE.size()));
            } while (usados.contains(nome));
            usados.add(nome);

            Product product = new Product();
            product.setName(nome);
            product.setCategory(PRODUTO_CATEGORIA.get(RNG.nextInt(PRODUTO_CATEGORIA.size())));
            product.setPrice(RNG.nextInt(3, 50) + 0.99);
            product.setActive(true);

            productRepository.save(product);
            System.out.println("Produto criado: " + nome + " (" + product.getCategory() + ")");
        }
    }
}
