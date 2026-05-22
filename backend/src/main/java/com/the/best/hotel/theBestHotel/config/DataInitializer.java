package com.the.best.hotel.theBestHotel.config;

import com.the.best.hotel.theBestHotel.model.Client;
import com.the.best.hotel.theBestHotel.model.Employee;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.ClientRepository;
import com.the.best.hotel.theBestHotel.repository.EmployeeRepository;
import com.the.best.hotel.theBestHotel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createIfNotExists("admin@gmail.com", "admin123", User.Role.ADMIN);
        createIfNotExists("funcionario@gmail.com", "func123", User.Role.EMPLOYEE);
        createIfNotExists("cliente@gmail.com", "cliente123", User.Role.CLIENT);
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
}
